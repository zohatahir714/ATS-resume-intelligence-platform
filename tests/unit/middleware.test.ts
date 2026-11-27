import type { User } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { describe, expect, it } from "vitest";

import {
  updateSession,
  type SessionRefresher,
} from "@/lib/supabase/middleware";

function request(path: string): NextRequest {
  return new NextRequest(`http://localhost:3000${path}`);
}

const anonymousVisitor: SessionRefresher = () => {
  return Promise.resolve({ user: null, response: NextResponse.next() });
};

const signedInVisitor: SessionRefresher = () => {
  const user = { id: "user-1" } as User;

  return Promise.resolve({ user, response: NextResponse.next() });
};

// What a deployment without NEXT_PUBLIC_SUPABASE_URL actually throws.
const failingRefresh: SessionRefresher = () => {
  return Promise.reject(
    new Error("Invalid public environment: NEXT_PUBLIC_SUPABASE_URL"),
  );
};

describe("updateSession", () => {
  it("keeps a public page up when the session refresh throws", async () => {
    const response = await updateSession(request("/"), failingRefresh);

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(response.headers.get("location")).toBeNull();
  });

  it("sends a protected page to /login when the session refresh throws", async () => {
    const response = await updateSession(request("/dashboard"), failingRefresh);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login",
    );
  });

  it("sends an anonymous visitor of a protected page to /login", async () => {
    const response = await updateSession(
      request("/dashboard"),
      anonymousVisitor,
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login",
    );
  });

  it("protects nested paths but not look-alike prefixes", async () => {
    const nested = await updateSession(
      request("/analyses/123"),
      anonymousVisitor,
    );
    const lookAlike = await updateSession(
      request("/dashboardish"),
      anonymousVisitor,
    );

    expect(nested.headers.get("location")).toBe("http://localhost:3000/login");
    expect(lookAlike.headers.get("x-middleware-next")).toBe("1");
  });

  it("lets a signed-in visitor through", async () => {
    const response = await updateSession(
      request("/dashboard"),
      signedInVisitor,
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(response.headers.get("location")).toBeNull();
  });
});
