import pino, { type DestinationStream, type Logger } from "pino";

export function createLogger(stream?: DestinationStream): Logger {
  return pino(
    {
      level: process.env.LOG_LEVEL ?? "info",
      base: {
        service: "joia-api",
      },
      redact: {
        paths: ["req.headers.authorization", "req.headers.cookie"],
        remove: true,
      },
    },
    stream,
  );
}
