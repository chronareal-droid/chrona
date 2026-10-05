"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Home, FolderOpen, CreditCard, Settings, Plus, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { AppLogo } from "@/components/app-logo";

const COLLAPSED_KEY = "sidebar-collapsed";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: Home },
  { href: "/dashboard/cases", label: "Cases", icon: FolderOpen },
  { href: "/api/billing/portal", label: "Billing", icon: CreditCard, external: true },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

function isActive(pathname: string, href: string) {
  return href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);
}

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem(COLLAPSED_KEY) === "true");
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      localStorage.setItem(COLLAPSED_KEY, String(!prev));
      return !prev;
    });
  }

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handler = () => setMobileOpen((prev) => !prev);
    window.addEventListener("toggle-sidebar", handler);
    return () => window.removeEventListener("toggle-sidebar", handler);
  }, []);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("sidebar-state", { detail: { open: mobileOpen } }));
  }, [mobileOpen]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <>
      {/* Mobile: full-width sheet under the header */}
      <div
        className={cn(
          "fixed inset-x-0 top-14 bottom-0 z-40 bg-[var(--foreground)]/20 backdrop-blur-[2px] transition-opacity duration-300 lg:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />
      <nav
        className={cn(
          "fixed inset-x-0 top-14 z-50 border-b border-[var(--border)] bg-[var(--background)] px-4 pt-3 pb-5 transition-[opacity,transform] duration-300 ease-[var(--ease-out-quint)] lg:hidden",
          mobileOpen ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0",
        )}
        aria-label="Dashboard"
      >
        <div className="flex flex-col">
          {navItems.map((item) => {
            const active = !item.external && isActive(pathname, item.href);
            const Icon = item.icon;
            const cls = cn(
              "flex items-center gap-3 rounded-xl px-3 py-3 text-[0.9375rem] transition-colors",
              active ? "bg-[var(--card)] font-medium text-[var(--foreground)]" : "text-[var(--muted)]",
            );
            return item.external ? (
              <a key={item.href} href={item.href} className={cls}>
                <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" /> {item.label}
              </a>
            ) : (
              <Link key={item.href} href={item.href} className={cls} aria-current={active ? "page" : undefined}>
                <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" /> {item.label}
              </Link>
            );
          })}
          <Link
            href="/dashboard/cases/new"
            className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-[var(--foreground)] py-3 text-sm font-medium text-[var(--background)]"
          >
            <Plus className="h-4 w-4" aria-hidden="true" /> New case
          </Link>
        </div>
      </nav>

      {/* Desktop */}
      <aside
        className={cn(
          "hidden shrink-0 flex-col border-r border-[var(--border)] transition-[width] duration-300 ease-[var(--ease-out-quint)] lg:flex",
          collapsed ? "w-[4.25rem]" : "w-60",
        )}
      >
        <div className={cn("flex h-16 items-center", collapsed ? "justify-center" : "px-5")}>
          <Link href="/" aria-label="Keepsit home">
            <AppLogo iconOnly={collapsed} />
          </Link>
        </div>

        <div className={cn("pt-2", collapsed ? "px-3" : "px-4")}>
          <Link
            href="/dashboard/cases/new"
            title={collapsed ? "New case (N)" : undefined}
            className={cn(
              "group flex h-10 items-center rounded-xl bg-[var(--foreground)] text-sm font-medium text-[var(--background)] transition-opacity hover:opacity-90",
              collapsed ? "justify-center" : "justify-between px-3.5",
            )}
          >
            <span className="flex items-center gap-2">
              <Plus className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" aria-hidden="true" />
              {!collapsed && "New case"}
            </span>
            {!collapsed && <kbd className="rounded border border-current/25 px-1.5 font-mono text-[10px] opacity-60">N</kbd>}
          </Link>
        </div>

        <nav className={cn("mt-6 flex-1 space-y-0.5", collapsed ? "px-3" : "px-4")} aria-label="Dashboard">
          {!collapsed && <p className="eyebrow mb-2 px-3 !text-[10px]">Workspace</p>}
          {navItems.map((item) => {
            const active = !item.external && isActive(pathname, item.href);
            const Icon = item.icon;
            const cls = cn(
              "relative flex h-9 items-center rounded-lg text-sm transition-colors",
              collapsed ? "justify-center" : "gap-3 px-3",
              active
                ? "bg-[var(--card)] font-medium text-[var(--foreground)] shadow-[0_0_0_1px_var(--border)]"
                : "text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]",
            );
            const body = (
              <>
                {active && !collapsed && (
                  <span className="absolute top-2 bottom-2 -left-4 w-[3px] rounded-r-full bg-[var(--accent)]" aria-hidden="true" />
                )}
                <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                {!collapsed && item.label}
              </>
            );
            return item.external ? (
              <a key={item.href} href={item.href} className={cls} title={collapsed ? item.label : undefined}>
                {body}
              </a>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className={cls}
                title={collapsed ? item.label : undefined}
                aria-current={active ? "page" : undefined}
              >
                {body}
              </Link>
            );
          })}
        </nav>

        <div className={cn("border-t border-[var(--border)] py-3", collapsed ? "px-3" : "px-4")}>
          <button
            type="button"
            onClick={toggleCollapsed}
            className={cn(
              "flex h-9 w-full items-center rounded-lg text-sm text-[var(--muted)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--foreground)]",
              collapsed ? "justify-center" : "gap-3 px-3",
            )}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            ) : (
              <>
                <PanelLeftClose className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" /> Collapse
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
