import { describe, expect, it } from "vitest";

import { formatCurrency, formatDateTime } from "../design/formatters.js";

describe("Brazilian formatters", () => {
  it("formats currency as BRL using pt-BR separators", () => {
    const formatted = formatCurrency(1234.5);

    expect(formatted).toContain("R$");
    expect(formatted).toContain("1.234,50");
  });

  it("formats date and time for Brazilian Portuguese", () => {
    expect(formatDateTime("2026-07-17T23:46:09.037Z")).toContain("17/07/2026");
  });
});
