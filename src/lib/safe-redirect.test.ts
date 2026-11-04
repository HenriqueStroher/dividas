import { describe, expect, it } from "vitest";
import { safeRedirectPath } from "./safe-redirect";

describe("safeRedirectPath", () => {
  it("aceita caminhos internos", () => {
    expect(safeRedirectPath("/redefinir-senha")).toBe("/redefinir-senha");
  });

  it.each(["https://evil.example", "//evil.example", "/\\evil.example", "evil", "", null, undefined])(
    "recusa %s",
    (next) => {
      expect(safeRedirectPath(next)).toBe("/");
    },
  );
});
