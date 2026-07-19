import { createServer, type Server } from "node:http";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import type { DestinationStream } from "pino";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createApp } from "../app.js";
import {
  createTestEmailSender,
  getAuditRows,
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
    // keep audit tests quiet while still exercising logger redaction
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

describe("auth audit logs", () => {
  it("records auth lifecycle events without storing submitted secrets", async () => {
    const bootstrapPassword = "Senha-bootstrap-123";
    const resetPassword = "Senha-reset-456";
    const changedPassword = "Senha-change-789";

    const bootstrapResponse = await fetch(`${baseUrl}/auth/bootstrap`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        tenant: { name: "Oficina Auditoria", document: "audit-doc" },
        companySettings: { tradeName: "Oficina Auditoria" },
        admin: {
          email: "admin-audit@joia.test",
          name: "Admin Auditoria",
          password: bootstrapPassword,
        },
      }),
    });
    expect(bootstrapResponse.status).toBe(201);

    const login = await loginAs({ baseUrl }, "admin-audit@joia.test", bootstrapPassword);

    const refreshResponse = await fetch(`${baseUrl}/auth/refresh`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        refreshToken: login.refreshToken,
      }),
    });
    expect(refreshResponse.status).toBe(200);
    const refreshed = (await refreshResponse.json()) as {
      data: { accessToken: string; refreshToken: string };
    };

    const resetRequestResponse = await fetch(`${baseUrl}/auth/password-reset/request`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        email: "admin-audit@joia.test",
      }),
    });
    expect(resetRequestResponse.status).toBe(202);
    const resetCode = emailSender.messages[0]?.code;

    const resetCompleteResponse = await fetch(`${baseUrl}/auth/password-reset/complete`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        code: resetCode,
        email: "admin-audit@joia.test",
        newPassword: resetPassword,
      }),
    });
    expect(resetCompleteResponse.status).toBe(204);

    const afterReset = await loginAs({ baseUrl }, "admin-audit@joia.test", resetPassword);
    const changePasswordResponse = await fetch(`${baseUrl}/auth/change-password`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${afterReset.accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        currentPassword: resetPassword,
        newPassword: changedPassword,
      }),
    });
    expect(changePasswordResponse.status).toBe(204);

    const logoutResponse = await fetch(`${baseUrl}/auth/logout`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${refreshed.data.accessToken}`,
        "content-type": "application/json",
      },
    });
    expect(logoutResponse.status).toBe(204);

    const auditRows = await getAuditRows(prisma);
    const actions = auditRows.map((row) => row.action);

    expect(actions).toEqual(
      expect.arrayContaining([
        "auth.bootstrap.created",
        "auth.login.succeeded",
        "auth.session.refreshed",
        "auth.logout",
        "auth.password_reset.requested",
        "auth.password_reset.completed",
        "auth.password.changed",
      ]),
    );

    const serializedAudit = JSON.stringify(auditRows);
    for (const secret of [
      bootstrapPassword,
      login.accessToken,
      login.refreshToken,
      refreshed.data.accessToken,
      refreshed.data.refreshToken,
      resetCode,
      resetPassword,
      afterReset.accessToken,
      afterReset.refreshToken,
      changedPassword,
    ]) {
      expect(serializedAudit).not.toContain(secret);
    }

    const serializedPayloads = JSON.stringify(auditRows.map((row) => row.payload));
    expect(serializedPayloads).not.toMatch(/password/i);
    expect(serializedPayloads).not.toMatch(/token/i);
    expect(serializedPayloads).not.toMatch(/code/i);
    expect(serializedPayloads).not.toMatch(/hash/i);
  });
});
