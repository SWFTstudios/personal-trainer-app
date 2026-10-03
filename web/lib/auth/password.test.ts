import { describe, expect, it } from "vitest";
import { hashPassword, randomToken, verifyPassword } from "./password";

describe("password hashing", () => {
  it("verifies the right password only", async () => {
    const hash = await hashPassword("correct horse");
    expect(hash).toMatch(/^pbkdf2\$100000\$/);
    expect(await verifyPassword("correct horse", hash)).toBe(true);
    expect(await verifyPassword("wrong horse", hash)).toBe(false);
    expect(await verifyPassword("x", "garbage")).toBe(false);
  });

  it("salts each hash and makes URL-safe tokens", async () => {
    expect(await hashPassword("a")).not.toBe(await hashPassword("a"));
    expect(randomToken()).toMatch(/^[\w-]{43}$/);
  });
});
