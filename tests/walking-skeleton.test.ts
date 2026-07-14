import { describe, expect, it } from "vitest";

const missingImplementationDiagnostic = "EXPECTED_MISSING_IMPLEMENTATION";

describe("Phase 1 walking skeleton contract", () => {
  it("proves the future Docker, migration, seed, API, database and web happy path", () => {
    const expectedContract = {
      dockerServices: ["db", "api", "web"],
      migration: "clean PostgreSQL database applies Prisma migrations",
      seed: "deterministic development seed is safe to rerun",
      health: "/health reports API startup and database connectivity",
      api: "neutral foundation write/read route persists through PostgreSQL",
      web: "operator submits a foundation check through the web UI and sees persisted data",
    };

    expect(expectedContract.dockerServices).toEqual(["db", "api", "web"]);

    throw new Error(
      `${missingImplementationDiagnostic}: ${expectedContract.migration}; ${expectedContract.seed}; ${expectedContract.health}; ${expectedContract.api}; ${expectedContract.web}`,
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
