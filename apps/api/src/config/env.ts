export type ApiEnv = {
  accessTokenTtlSeconds: number;
  authRateLimitMax: number;
  authRateLimitWindowMs: number;
  databaseUrl: string;
  jwtAccessSecret: string;
  jwtAudience: string;
  jwtIssuer: string;
  nodeEnv: "development" | "test" | "production";
  passwordResetTtlMinutes: number;
  port: number;
  refreshTokenTtlDays: number;
  smtp: SmtpEnv | null;
  webOrigin: string;
};

export type SmtpEnv = {
  from: string;
  host: string;
  pass?: string | undefined;
  port: number;
  secure: boolean;
  user?: string | undefined;
};

const DEFAULT_PORT = 3000;
const DEFAULT_WEB_ORIGIN = "http://localhost:5173";
const DEFAULT_JWT_ISSUER = "joia-api";
const DEFAULT_JWT_AUDIENCE = "joia-web";
const DEFAULT_ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const DEFAULT_REFRESH_TOKEN_TTL_DAYS = 30;
const DEFAULT_PASSWORD_RESET_TTL_MINUTES = 15;
const DEFAULT_AUTH_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const DEFAULT_AUTH_RATE_LIMIT_MAX = 20;
const DEVELOPMENT_JWT_SECRET = "joia-development-access-token-secret-change-before-production";

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
  const jwtAccessSecret =
    source.JWT_ACCESS_SECRET ?? (nodeEnv === "production" ? undefined : DEVELOPMENT_JWT_SECRET);

  if (!jwtAccessSecret || jwtAccessSecret.length < 32) {
    throw new Error("JWT_ACCESS_SECRET must be at least 32 characters.");
  }

  return {
    accessTokenTtlSeconds: parsePositiveInteger(
      source.ACCESS_TOKEN_TTL_SECONDS,
      DEFAULT_ACCESS_TOKEN_TTL_SECONDS,
      "ACCESS_TOKEN_TTL_SECONDS",
    ),
    authRateLimitMax: parsePositiveInteger(
      source.AUTH_RATE_LIMIT_MAX,
      DEFAULT_AUTH_RATE_LIMIT_MAX,
      "AUTH_RATE_LIMIT_MAX",
    ),
    authRateLimitWindowMs: parsePositiveInteger(
      source.AUTH_RATE_LIMIT_WINDOW_MS,
      DEFAULT_AUTH_RATE_LIMIT_WINDOW_MS,
      "AUTH_RATE_LIMIT_WINDOW_MS",
    ),
    databaseUrl,
    jwtAccessSecret,
    jwtAudience: source.JWT_AUDIENCE ?? DEFAULT_JWT_AUDIENCE,
    jwtIssuer: source.JWT_ISSUER ?? DEFAULT_JWT_ISSUER,
    nodeEnv,
    passwordResetTtlMinutes: parsePositiveInteger(
      source.PASSWORD_RESET_TTL_MINUTES,
      DEFAULT_PASSWORD_RESET_TTL_MINUTES,
      "PASSWORD_RESET_TTL_MINUTES",
    ),
    port,
    refreshTokenTtlDays: parsePositiveInteger(
      source.REFRESH_TOKEN_TTL_DAYS,
      DEFAULT_REFRESH_TOKEN_TTL_DAYS,
      "REFRESH_TOKEN_TTL_DAYS",
    ),
    smtp: parseSmtpEnv(source),
    webOrigin: source.WEB_ORIGIN ?? DEFAULT_WEB_ORIGIN,
  };
}

function parseNodeEnv(value: string | undefined): ApiEnv["nodeEnv"] {
  if (value === "production" || value === "test") {
    return value;
  }

  return "development";
}

function parsePositiveInteger(value: string | undefined, fallback: number, name: string): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }

  return parsed;
}

function parseSmtpEnv(source: NodeJS.ProcessEnv): SmtpEnv | null {
  if (!source.SMTP_HOST) {
    return null;
  }

  if (!source.SMTP_FROM) {
    throw new Error("SMTP_FROM is required when SMTP_HOST is configured.");
  }

  return {
    from: source.SMTP_FROM,
    host: source.SMTP_HOST,
    pass: source.SMTP_PASS,
    port: parsePositiveInteger(source.SMTP_PORT, 587, "SMTP_PORT"),
    secure: source.SMTP_SECURE === "true",
    user: source.SMTP_USER,
  };
}
