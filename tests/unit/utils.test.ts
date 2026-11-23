import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
  it("merges conflicting tailwind utility classes", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("keeps non-conflicting utility classes", () => {
    expect(cn("font-semibold", "tracking-tight")).toBe(
      "font-semibold tracking-tight",
    );
  });
});
