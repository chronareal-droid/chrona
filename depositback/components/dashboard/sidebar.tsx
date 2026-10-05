"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { AppLogo } from "@/components/app-logo";

const COLLAPSED_KEY = "sidebar-collapsed";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: HomeIcon },
  { href: "/dashboard/cases", label: "My cases", icon: ProjectsIcon },
  { href: "/api/billing/portal", label: "Billing", icon: BillingIcon, external: true },
  { href: "/dashboard/settings", label: "Settings", icon: SettingsIcon },
];

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // Restore collapsed state from localStorage on mount
  useEffect(() => {
    setCollapsed(localStorage.getItem(COLLAPSED_KEY) === "true");
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(COLLAPSED_KEY, String(next));
      return next;
    });
  }

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Listen for toggle events from the header's SidebarToggle button
  useEffect(() => {
    const handler = () => setMobileOpen((prev) => !prev);
    window.addEventListener("toggle-sidebar", handler);
    return () => window.removeEventListener("toggle-sidebar", handler);
  }, []);

  // Broadcast state to SidebarToggle so icon can sync
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("sidebar-state", { detail: { open: mobileOpen } }));
  }, [mobileOpen]);

  // Lock body scroll when sidebar is open on mobile
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <>
      {/* ── Mobile: overlay + dropdown sheet ── */}
      <div
        className={cn(
          "fixed inset-x-0 top-14 bottom-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity duration-200 lg:hidden",
          mobileOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setMobileOpen(false)}
        onKeyDown={(e) => { if (e.key === "Escape") setMobileOpen(false); }}
        role="button"
        tabIndex={-1}
        aria-label="Close sidebar"
      />

      <nav
        className={cn(
          "fixed top-14 left-0 right-0 z-50 border-b border-[var(--border)] bg-[var(--background)] px-4 pb-4 pt-2 transition-all duration-200 lg:hidden",
          mobileOpen
            ? "translate-y-0 opacity-100"
            : "-translate-y-2 opacity-0 pointer-events-none"
        )}
        style={{ overscrollBehavior: "contain" }}
      >
        <div className="mx-auto flex max-w-5xl flex-col gap-0.5">
          {navItems.map((item) => {
            const isActive =
              !item.external &&
              (item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href));

            return item.external ? (
              <a
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors",
                  "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface)]"
                )}
              >
                <item.icon />
                {item.label}
              </a>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors",
                  isActive
                    ? "text-[var(--foreground)] font-medium bg-[var(--surface)]"
                    : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface)]"
                )}
              >
                <item.icon />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* ── Desktop: collapsible sidebar ── */}
      <aside
        className={cn(
          "hidden lg:flex inset-y-0 left-0 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--background)] transition-[width] duration-200",
          collapsed ? "w-14" : "w-56"
        )}
      >
        <div className={cn(
          "flex h-14 items-center border-b border-[var(--border)]",
          collapsed ? "justify-center px-0" : "px-5"
        )}>
          <Link href="/" title={collapsed ? "Home" : undefined}>
            {collapsed ? <AppLogo iconOnly /> : <AppLogo />}
          </Link>
        </div>

        <nav className={cn("flex-1 space-y-0.5", collapsed ? "p-1.5" : "p-2")}>
          {navItems.map((item) => {
            const isActive =
              !item.external &&
              (item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href));

            const classes = cn(
              "flex items-center rounded-lg text-sm transition-colors",
              collapsed
                ? "justify-center h-9 w-9 mx-auto"
                : "gap-2.5 px-3 py-2",
              isActive
                ? "bg-[var(--surface)] text-[var(--foreground)] font-medium"
                : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface)]"
            );

            if (item.external) {
              return (
                <a key={item.href} href={item.href} className={classes} title={collapsed ? item.label : undefined}>
                  <item.icon />
                  {!collapsed && item.label}
                </a>
              );
            }

            return (
              <Link key={item.href} href={item.href} className={classes} title={collapsed ? item.label : undefined}>
                <item.icon />
                {!collapsed && item.label}
              </Link>
            );
          })}
        </nav>

        {/* Collapse toggle */}
        <div className={cn(
          "border-t border-[var(--border)]",
          collapsed ? "p-1.5" : "p-2"
        )}>
          <button
            type="button"
            onClick={toggleCollapsed}
            className={cn(
              "flex items-center rounded-lg text-sm text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface)] transition-colors",
              collapsed
                ? "justify-center h-9 w-9 mx-auto"
                : "gap-2.5 px-3 py-2 w-full"
            )}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <CollapseIcon collapsed={collapsed} />
            {!collapsed && "Collapse"}
          </button>
        </div>
      </aside>
    </>
  );
}

function HomeIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  );
}

function ProjectsIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  );
}

function BillingIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function CollapseIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
      {collapsed ? (
        // Chevrons right (expand)
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 4.5l7.5 7.5-7.5 7.5m-6-15l7.5 7.5-7.5 7.5" />
      ) : (
        // Chevrons left (collapse)
        <path strokeLinecap="round" strokeLinejoin="round" d="M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15L5.25 12l7.5-7.5" />
      )}
    </svg>
  );
}
