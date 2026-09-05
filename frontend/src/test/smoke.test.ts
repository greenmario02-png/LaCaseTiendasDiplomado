import { describe, it, expect } from "vitest";

describe("setup vitest", () => {
  it("corre el entorno jsdom", () => {
    expect(typeof window).toBe("object");
    expect(document.createElement("div")).toBeTruthy();
  });
});
