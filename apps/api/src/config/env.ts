export type ApiEnv = {
  databaseUrl: string;
  nodeEnv: "development" | "test" | "production";
  port: number;
  webOrigin: string;
};

const DEFAULT_PORT = 3000;
const DEFAULT_WEB_ORIGIN = "http://localhost:5173";

export function readApiEnv(source: NodeJS.ProcessEnv = process.env): ApiEnv {
  const databaseUrl = source.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required.");
  }

  const portValue = source.API_PORT ?? source.PORT;
  const port = portValue ? Number(portValue) : DEFAULT_PORT;

  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error("API port must be a valid TCP port.");
  }

  const nodeEnv = parseNodeEnv(source.NODE_ENV);

  return {
    databaseUrl,
    nodeEnv,
    port,
    webOrigin: source.WEB_ORIGIN ?? DEFAULT_WEB_ORIGIN,
  };
}

function parseNodeEnv(value: string | undefined): ApiEnv["nodeEnv"] {
  if (value === "production" || value === "test") {
    return value;
  }

  return "development";
}
