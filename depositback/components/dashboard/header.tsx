import Link from "next/link";
import type { Session } from "@/lib/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { AppLogo } from "@/components/app-logo";
import { SidebarToggle } from "./sidebar-toggle";
import { UserMenu } from "./user-menu";

export function DashboardHeader({ session }: { session: Session }) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-[var(--border)] px-4 sm:px-6">
      {/* Left — hamburger + logo (mobile only) */}
      <div className="flex items-center gap-2 lg:hidden">
        <SidebarToggle />
        <Link href="/" className="flex h-9 items-center">
          <AppLogo />
        </Link>
      </div>

      {/* Spacer on desktop (sidebar provides the logo) */}
      <div className="hidden lg:block" />

      {/* Right — email + theme toggle (desktop), avatar dropdown */}
      <div className="flex items-center gap-3">
        <span className="hidden text-xs text-[var(--muted)] lg:block">
          {session.email}
        </span>
        <div className="hidden lg:block">
          <ThemeToggle />
        </div>
        <UserMenu
          name={session.name}
          email={session.email}
          profileImageUrl={session.profileImageUrl}
        />
      </div>
    </header>
  );
}
