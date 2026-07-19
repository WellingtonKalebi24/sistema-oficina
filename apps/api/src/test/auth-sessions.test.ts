import { createServer, type Server } from "node:http";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import type { DestinationStream } from "pino";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createApp } from "../app.js";
import {
  createTenantWithAdmin,
  createTestEmailSender,
  loginAs,
  resetIdentityTables,
  type TestEmailSender,
} from "./testData.js";

const connectionString =
  process.env.DATABASE_URL ??
  "postgresql://joia:joia_dev_password@localhost:55432/joia_dev?schema=public";

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

let server: Server;
let baseUrl: string;
let emailSender: TestEmailSender;

const logStream: DestinationStream = {
  write() {
    // keep auth tests quiet while still exercising the app logger seam
  },
};

beforeAll(async () => {
  process.env.DATABASE_URL = connectionString;
  emailSender = createTestEmailSender();

  server = createServer(
    createApp({
      emailSender,
      logStream,
      prisma,
    }),
  );

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();

  if (!address || typeof address === "string") {
    throw new Error("Could not resolve test server address.");
  }

  baseUrl = `http://127.0.0.1:${address.port}`;
});

beforeEach(async () => {
  emailSender.clear();
  await resetIdentityTables(prisma);
});

afterAll(async () => {
  if (server) {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }

  await prisma.$disconnect();
});

describe("auth sessions", () => {
  it("allows two active sessions for the same user", async () => {
    const fixture = await createTenantWithAdmin(prisma);

    const first = await loginAs({ baseUrl }, fixture.adminEmail, fixture.adminPassword, "device-a");
    const second = await loginAs(
      { baseUrl },
      fixture.adminEmail,
      fixture.adminPassword,
      "device-b",
    );

    expect(first.sessionId).not.toBe(second.sessionId);
    expect(first.refreshToken).not.toBe(second.refreshToken);
    expect(first.accessToken).toEqual(expect.any(String));
    expect(second.accessToken).toEqual(expect.any(String));
  });

  it("refresh rotates only the active session refresh secret", async () => {
    const fixture = await createTenantWithAdmin(prisma);
    const active = await loginAs(
      { baseUrl },
      fixture.adminEmail,
      fixture.adminPassword,
      "active-device",
    );
    const other = await loginAs(
      { baseUrl },
      fixture.adminEmail,
      fixture.adminPassword,
      "other-device",
    );

    const refreshResponse = await fetch(`${baseUrl}/auth/refresh`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        refreshToken: active.refreshToken,
      }),
    });

    const body = (await refreshResponse.json()) as {
      data: { accessToken: string; refreshToken: string; sessionId: string };
    };

    expect(refreshResponse.status).toBe(200);
    expect(body.data.sessionId).toBe(active.sessionId);
    expect(body.data.refreshToken).not.toBe(active.refreshToken);

    const otherRefreshResponse = await fetch(`${baseUrl}/auth/refresh`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        refreshToken: other.refreshToken,
      }),
    });

    expect(otherRefreshResponse.status).toBe(200);
  });

  it("logout revokes only the current session", async () => {
    const fixture = await createTenantWithAdmin(prisma);
    const current = await loginAs(
      { baseUrl },
      fixture.adminEmail,
      fixture.adminPassword,
      "current-device",
    );
    const other = await loginAs(
      { baseUrl },
      fixture.adminEmail,
      fixture.adminPassword,
      "other-device",
    );

    const logoutResponse = await fetch(`${baseUrl}/auth/logout`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${current.accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        refreshToken: current.refreshToken,
      }),
    });

    expect(logoutResponse.status).toBe(204);

    const revokedRefreshResponse = await fetch(`${baseUrl}/auth/refresh`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        refreshToken: current.refreshToken,
      }),
    });
    const otherRefreshResponse = await fetch(`${baseUrl}/auth/refresh`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        refreshToken: other.refreshToken,
      }),
    });

    expect(revokedRefreshResponse.status).toBe(401);
    expect(otherRefreshResponse.status).toBe(200);
  });

  it("returns sanitized current-user data only for an active bearer session", async () => {
    const fixture = await createTenantWithAdmin(prisma);
    const current = await loginAs(
      { baseUrl },
      fixture.adminEmail,
      fixture.adminPassword,
      "current-device",
    );

    const missingAuthResponse = await fetch(`${baseUrl}/auth/me`);
    const currentUserResponse = await fetch(`${baseUrl}/auth/me`, {
      headers: {
        authorization: `Bearer ${current.accessToken}`,
      },
    });
    const body = (await currentUserResponse.json()) as {
      data: {
        session: { id: string };
        tenantId: string;
        user: { email: string; permissions: string[]; tenantId: string };
      };
    };

    expect(missingAuthResponse.status).toBe(401);
    expect(currentUserResponse.status).toBe(200);
    expect(body.data).toMatchObject({
      session: { id: current.sessionId },
      tenantId: fixture.tenantId,
      user: {
        email: fixture.adminEmail,
        tenantId: fixture.tenantId,
      },
    });
    expect(body.data.user.permissions).toEqual(expect.arrayContaining(["users.createAdmin"]));
    expect(JSON.stringify(body)).not.toContain("password");
    expect(JSON.stringify(body)).not.toContain("refreshToken");
  });

  it("requests and completes password reset using a single-use code sent to registered email", async () => {
    const fixture = await createTenantWithAdmin(prisma);
    const unknownEmail = "nao-cadastrado@joia.test";

    const unknownResponse = await fetch(`${baseUrl}/auth/password-reset/request`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        email: unknownEmail,
      }),
    });

    expect(unknownResponse.status).toBe(202);
    expect(emailSender.messages).toHaveLength(0);

    const requestResponse = await fetch(`${baseUrl}/auth/password-reset/request`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        email: fixture.adminEmail,
      }),
    });

    expect(requestResponse.status).toBe(202);
    expect(emailSender.messages).toHaveLength(1);
    expect(emailSender.messages[0]).toMatchObject({
      purpose: "auth.password_reset",
      to: fixture.adminEmail,
    });

    const resetCode = emailSender.messages[0]?.code;
    expect(resetCode).toMatch(/^\d{6}$/);

    const completeResponse = await fetch(`${baseUrl}/auth/password-reset/complete`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        code: resetCode,
        email: fixture.adminEmail,
        newPassword: "Senha-nova-456",
      }),
    });

    expect(completeResponse.status).toBe(204);

    const reuseResponse = await fetch(`${baseUrl}/auth/password-reset/complete`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        code: resetCode,
        email: fixture.adminEmail,
        newPassword: "Senha-outra-789",
      }),
    });

    expect(reuseResponse.status).toBe(401);

    const oldLoginResponse = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        email: fixture.adminEmail,
        password: fixture.adminPassword,
      }),
    });
    const newLogin = await loginAs({ baseUrl }, fixture.adminEmail, "Senha-nova-456");

    expect(oldLoginResponse.status).toBe(401);
    expect(newLogin.accessToken).toEqual(expect.any(String));
  });

  it("changes password only for authenticated users with the current password", async () => {
    const fixture = await createTenantWithAdmin(prisma);
    const current = await loginAs({ baseUrl }, fixture.adminEmail, fixture.adminPassword);

    const wrongCurrentResponse = await fetch(`${baseUrl}/auth/change-password`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${current.accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        currentPassword: "senha-incorreta",
        newPassword: "Senha-nova-456",
      }),
    });

    expect(wrongCurrentResponse.status).toBe(401);

    const changeResponse = await fetch(`${baseUrl}/auth/change-password`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${current.accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        currentPassword: fixture.adminPassword,
        newPassword: "Senha-nova-456",
      }),
    });

    expect(changeResponse.status).toBe(204);

    const oldLoginResponse = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        email: fixture.adminEmail,
        password: fixture.adminPassword,
      }),
    });
    const newLogin = await loginAs({ baseUrl }, fixture.adminEmail, "Senha-nova-456");

    expect(oldLoginResponse.status).toBe(401);
    expect(newLogin.accessToken).toEqual(expect.any(String));
  });
});
