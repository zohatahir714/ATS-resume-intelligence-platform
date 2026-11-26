"use client";

import {
  FilePlus2,
  Files,
  LayoutDashboard,
  Settings,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { isActiveNavPath } from "@/lib/navigation";
import { cn } from "@/lib/utils";

interface NavItem {
  readonly href: string;
  readonly label: string;
  readonly icon: LucideIcon;
}

/** The four app sections (`frontend.md` §2). Pages arrive in later tasks. */
const NAV_ITEMS: readonly NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/analyses/new", label: "New analysis", icon: FilePlus2 },
  { href: "/resumes", label: "Resumes", icon: Files },
  { href: "/settings", label: "Settings", icon: Settings },
];

const ITEM_BASE =
  "flex items-center gap-2 rounded-md text-sm transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none";

const ITEM_IDLE = "text-muted-foreground hover:bg-muted hover:text-foreground";

const ITEM_ACTIVE = "bg-muted font-medium text-foreground";

export interface AppNavProps {
  /** `sidebar` stacks links; `bar` is the compact row used under the top bar. */
  readonly layout?: "sidebar" | "bar";
  readonly className?: string;
}

export function AppNav({ layout = "sidebar", className }: AppNavProps) {
  const pathname = usePathname();
  const isBar = layout === "bar";

  return (
    <nav aria-label="Main" className={className}>
      <ul
        className={cn(
          "flex",
          isBar ? "items-center gap-1" : "flex-col gap-0.5",
        )}
      >
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActiveNavPath(pathname, href);

          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                title={isBar ? label : undefined}
                className={cn(
                  ITEM_BASE,
                  isBar ? "size-10 justify-center" : "px-2 py-1.5",
                  active ? ITEM_ACTIVE : ITEM_IDLE,
                )}
              >
                <Icon aria-hidden className="size-4 shrink-0" />
                <span className={isBar ? "sr-only" : undefined}>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
