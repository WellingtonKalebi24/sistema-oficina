import { createServer, type Server } from "node:http";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import type { DestinationStream } from "pino";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createApp } from "../app.js";

type FoundationCheckDelegate = {
  deleteMany(): Promise<unknown>;
};

type HealthResponse = {
  status: string;
  database: string;
  checkedAt: string;
};

type FoundationCheckResponse = {
  data: {
    id: string;
    label: string;
    status: string;
    createdAt: string;
    updatedAt: string;
  };
};

type FoundationCheckListResponse = {
  data: FoundationCheckResponse["data"][];
};

const connectionString =
  process.env.DATABASE_URL ??
  "postgresql://joia:joia_dev_password@localhost:55432/joia_dev?schema=public";

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter }) as PrismaClient & {
  foundationCheck: FoundationCheckDelegate;
};

let server: Server;
let baseUrl: string;
const logLines: string[] = [];

const logStream: DestinationStream = {
  write(message: string) {
    logLines.push(message);
  },
};

beforeAll(async () => {
  process.env.DATABASE_URL = connectionString;

  server = createServer(
    createApp({
      enableTestRoutes: true,
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
  logLines.length = 0;
  await prisma.foundationCheck.deleteMany();
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

describe("JO.IA API foundation", () => {
  it("reports database-connected health", async () => {
    const response = await fetch(`${baseUrl}/health`);
    const body = (await response.json()) as HealthResponse;

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      status: "ok",
      database: "connected",
    });
    expect(new Date(body.checkedAt).toString()).not.toBe("Invalid Date");
  });

  it("persists and reads neutral foundation checks", async () => {
    const createResponse = await fetch(`${baseUrl}/foundation-checks`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ label: "API persistence proof" }),
    });

    expect(createResponse.status).toBe(201);

    const createBody = (await createResponse.json()) as FoundationCheckResponse;
    expect(createBody.data).toMatchObject({
      label: "API persistence proof",
      status: "recorded",
    });

    const listResponse = await fetch(`${baseUrl}/foundation-checks`);
    const listBody = (await listResponse.json()) as FoundationCheckListResponse;

    expect(listResponse.status).toBe(200);
    expect(listBody.data).toHaveLength(1);
    expect(listBody.data[0]).toMatchObject({
      id: createBody.data.id,
      label: "API persistence proof",
      status: "recorded",
    });
  });

  it("returns sanitized JSON for unexpected errors", async () => {
    const response = await fetch(`${baseUrl}/__test/forced-error`);
    const bodyText = await response.text();

    expect(response.status).toBe(500);
    expect(bodyText).toContain("Internal server error");
    expect(bodyText).not.toContain("forced failure");
    expect(bodyText).not.toContain("DATABASE_URL");
    expect(bodyText).not.toContain("Error:");
  });

  it("emits structured request logs without body or environment values", async () => {
    await fetch(`${baseUrl}/foundation-checks`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ label: "log body must not be serialized" }),
    });

    expect(logLines.length).toBeGreaterThan(0);

    const parsedLogs = logLines.map((line) => JSON.parse(line) as Record<string, unknown>);
    const requestLog = parsedLogs.find((line) => line.req);

    expect(requestLog).toBeDefined();
    expect(JSON.stringify(parsedLogs)).toContain('"method":"POST"');
    expect(JSON.stringify(parsedLogs)).not.toContain("log body must not be serialized");
    expect(JSON.stringify(parsedLogs)).not.toContain(connectionString);
  });
});
