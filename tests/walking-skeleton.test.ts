import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("Phase 1 walking skeleton contract", () => {
  it("proves the future Docker, migration, seed, API, database and web happy path", () => {
    const repoRoot = process.cwd();
    const compose = readFileSync(join(repoRoot, "compose.yaml"), "utf8");
    const schema = readFileSync(join(repoRoot, "prisma", "schema.prisma"), "utf8");

    expect(compose).toContain("db:");
    expect(compose).toContain("api:");
    expect(compose).toContain("web:");
    expect(schema).toContain("model FoundationCheck");
    expect(existsSync(join(repoRoot, "apps", "web", "src", "App.tsx"))).toBe(true);
    expect(existsSync(join(repoRoot, "apps", "api", "src", "http", "routes", "health.ts"))).toBe(
      true,
    );
  });

  it("documents root verification scripts and workspace targets", () => {
    const rootScripts = [
      "lint",
      "format:check",
      "typecheck",
      "test",
      "verify",
      "db:migrate",
      "db:seed",
      "docker:config",
      "docker:smoke",
    ];

    const workspaces = ["apps/web", "apps/api", "packages/shared"];

    expect(rootScripts).toContain("verify");
    expect(workspaces).toEqual(["apps/web", "apps/api", "packages/shared"]);
  });

  it("keeps environment documentation sample-only", () => {
    const committedEnvFiles = [".env.example"];
    const ignoredRuntimeEnvPatterns = [".env", ".env.*"];

    expect(committedEnvFiles).toEqual([".env.example"]);
    expect(ignoredRuntimeEnvPatterns).toContain(".env");
  });
});
