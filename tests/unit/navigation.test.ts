import { describe, expect, it } from "vitest";

import { isActiveNavPath } from "@/lib/navigation";

describe("isActiveNavPath", () => {
  it("activates a link on its own path", () => {
    expect(isActiveNavPath("/dashboard", "/dashboard")).toBe(true);
    expect(isActiveNavPath("/resumes", "/resumes")).toBe(true);
    expect(isActiveNavPath("/analyses/new", "/analyses/new")).toBe(true);
  });

  it("activates a link on its child paths", () => {
    expect(isActiveNavPath("/resumes/abc", "/resumes")).toBe(true);
    expect(isActiveNavPath("/dashboard/", "/dashboard")).toBe(true);
    expect(isActiveNavPath("/analyses/new/step-2", "/analyses/new")).toBe(true);
  });

  it("stays inactive on siblings that share a prefix", () => {
    expect(isActiveNavPath("/resumesomething", "/resumes")).toBe(false);
    expect(isActiveNavPath("/dashboardish", "/dashboard")).toBe(false);
    expect(isActiveNavPath("/analyses/abc", "/analyses/new")).toBe(false);
  });

  it("stays inactive on other sections and the root", () => {
    expect(isActiveNavPath("/login", "/dashboard")).toBe(false);
    expect(isActiveNavPath("/", "/dashboard")).toBe(false);
    expect(isActiveNavPath(null, "/dashboard")).toBe(false);
  });
});
