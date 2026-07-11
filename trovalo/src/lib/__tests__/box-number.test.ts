import { describe, it, expect } from "vitest";
import { boxNumber } from "../box-number";

describe("boxNumber", () => {
  it("extracts number from trovalo format", () => {
    expect(boxNumber("trovalo-abc123-1")).toBe("1");
  });

  it("extracts multi-digit number", () => {
    expect(boxNumber("trovalo-xyz789-42")).toBe("42");
  });

  it("extracts zero", () => {
    expect(boxNumber("trovalo-abc-0")).toBe("0");
  });

  it("handles old qr format", () => {
    expect(boxNumber("qr-batch-7")).toBe("7");
  });

  it("handles box format", () => {
    expect(boxNumber("box-5")).toBe("5");
  });

  it("returns full id when no number suffix", () => {
    expect(boxNumber("no-number")).toBe("no-number");
  });

  it("returns full id when empty string", () => {
    expect(boxNumber("")).toBe("");
  });

  it("handles very large numbers", () => {
    expect(boxNumber("trovalo-x-99999")).toBe("99999");
  });
});
