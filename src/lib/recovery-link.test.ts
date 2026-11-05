import { describe, expect, it } from "vitest";
import { parseRecoveryHash } from "./recovery-link";

describe("parseRecoveryHash", () => {
  it("lê os tokens de um link de redefinição", () => {
    expect(parseRecoveryHash("#access_token=abc&refresh_token=def&token_type=bearer&type=recovery")).toEqual({
      accessToken: "abc",
      refreshToken: "def",
    });
  });

  it("ignora links de outro tipo", () => {
    expect(parseRecoveryHash("#access_token=abc&refresh_token=def&type=signup")).toBeNull();
  });

  it("ignora links sem token", () => {
    expect(parseRecoveryHash("#type=recovery&access_token=abc")).toBeNull();
    expect(parseRecoveryHash("#error=access_denied&error_code=otp_expired")).toBeNull();
    expect(parseRecoveryHash("")).toBeNull();
  });
});
