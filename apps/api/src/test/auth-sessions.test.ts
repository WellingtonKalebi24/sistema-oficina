import { createServer, type Server } from "node:http";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import type { DestinationStream } from "pino";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createApp } from "../app.js";
import { createTenantWithAdmin, loginAs, resetIdentityTables } from "./testData.js";

const connectionString =
  process.env.DATABASE_URL ??
  "postgresql://joia:joia_dev_password@localhost:55432/joia_dev?schema=public";

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

let server: Server;
let baseUrl: string;

const logStream: DestinationStream = {
  write() {
    // keep auth tests quiet while still exercising the app logger seam
  },
};

beforeAll(async () => {
  process.env.DATABASE_URL = connectionString;

  server = createServer(
    createApp({
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
    const second = await loginAs({ baseUrl }, fixture.adminEmail, fixture.adminPassword, "device-b");

    expect(first.sessionId).not.toBe(second.sessionId);
    expect(first.refreshToken).not.toBe(second.refreshToken);
    expect(first.accessToken).toEqual(expect.any(String));
    expect(second.accessToken).toEqual(expect.any(String));
  });

  it("refresh rotates only the active session refresh secret", async () => {
    const fixture = await createTenantWithAdmin(prisma);
    const active = await loginAs({ baseUrl }, fixture.adminEmail, fixture.adminPassword, "active-device");
    const other = await loginAs({ baseUrl }, fixture.adminEmail, fixture.adminPassword, "other-device");

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
    const current = await loginAs({ baseUrl }, fixture.adminEmail, fixture.adminPassword, "current-device");
    const other = await loginAs({ baseUrl }, fixture.adminEmail, fixture.adminPassword, "other-device");

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
});
