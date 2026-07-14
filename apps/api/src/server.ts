import { createServer } from "node:http";

import { createApp } from "./app.js";
import { readApiEnv } from "./config/env.js";
import { createLogger } from "./logging/logger.js";

const env = readApiEnv();
const logger = createLogger();
const server = createServer(createApp({ logger }));

server.listen(env.port, () => {
  logger.info({ port: env.port }, "JO.IA API listening");
});
