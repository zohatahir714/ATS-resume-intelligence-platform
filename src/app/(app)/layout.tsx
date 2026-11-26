import { AppSidebar } from "@/components/app-shell/app-sidebar";
import { AppTopBar } from "@/components/app-shell/app-top-bar";
import { requireUser } from "@/lib/auth";
import { readTheme } from "@/lib/theme-server";

/**
 * Shell for every signed-in page: slim sidebar, top bar, content.
 *
 * `requireUser()` guards the whole group here, so pages below do not repeat it;
 * `src/middleware.ts` has already turned anonymous visitors away before this
 * renders.
 */
export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [user, theme] = await Promise.all([requireUser(), readTheme()]);

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopBar email={user.email ?? ""} theme={theme} />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 md:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
