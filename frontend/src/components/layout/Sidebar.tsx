"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Bot,
  CreditCard,
  Gift,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  Users,
  DollarSign,
} from "lucide-react";

import { useAuthStore } from "@/store/authStore";
import { useUiStore } from "@/store/uiStore";
import { cn } from "@/lib/utils";

const userNav = [
  { href: "/dashboard", label: "Главная", icon: LayoutDashboard },
  { href: "/codeai", label: "CodeAI", icon: Bot },
  { href: "/billing", label: "Подписка", icon: CreditCard },
  { href: "/referrals", label: "Рефералы", icon: Gift },
  { href: "/settings", label: "Настройки", icon: Settings },
];

const adminNav = [
  { href: "/admin", label: "Админ", icon: ShieldCheck },
  { href: "/admin/users", label: "Пользователи", icon: Users },
  { href: "/admin/billing", label: "Платежи", icon: DollarSign },
  { href: "/admin/referrals", label: "Выплаты", icon: Gift },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);

  return (
    <nav className="flex flex-col gap-0.5 p-3">
      {userNav.map((item) => {
        const Icon = item.icon;
        const active =
          pathname === item.href ||
          (item.href !== "/dashboard" && pathname?.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-xl py-2.5 px-3 text-sm font-medium transition-all duration-200",
              active
                ? "bg-[rgba(0,102,255,0.08)] text-[#0066FF]"
                : "text-[#8e8e93] hover:bg-black/[0.04] hover:text-[#171717]",
            )}
          >
            <Icon
              className="h-4 w-4 shrink-0"
              strokeWidth={active ? 2 : 1.75}
            />
            {item.label}
          </Link>
        );
      })}

      {user?.role === "admin" && (
        <>
          <div className="my-3 border-t border-black/[0.06]" />
          <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-[#b0b0b8]">
            Администрирование
          </div>
          {adminNav.map((item) => {
            const Icon = item.icon;
            const active = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 rounded-xl py-2.5 px-3 text-sm font-medium transition-all duration-200",
                  active
                    ? "bg-[rgba(0,102,255,0.08)] text-[#0066FF]"
                    : "text-[#8e8e93] hover:bg-black/[0.04] hover:text-[#171717]",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" strokeWidth={active ? 2 : 1.75} />
                {item.label}
              </Link>
            );
          })}
        </>
      )}
    </nav>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      <div
        className="flex h-14 items-center gap-2 px-5"
        style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}
      >
        <Image
          src="/logo.png"
          alt="logo"
          width={26}
          height={26}
          style={{ borderRadius: '7px' }}
        />
        <span
          style={{
            fontFamily: 'Geist, sans-serif',
            fontWeight: 700,
            fontSize: '15px',
            color: '#171717',
            letterSpacing: '-0.02em',
          }}
        >
          OpenSaaS
        </span>
      </div>
      <NavLinks onNavigate={onNavigate} />
    </>
  );
}

export function Sidebar() {
  const { sidebarOpen, setSidebarOpen, autoCollapsed } = useUiStore();

  // On CodeAI pages the page itself has its own left panel — hide desktop sidebar completely.
  // Keep mobile drawer so hamburger still works on small screens.
  if (autoCollapsed) {
    return (
      <>
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-72 bg-white transition-transform duration-300 ease-in-out md:hidden",
            sidebarOpen ? "translate-x-0" : "-translate-x-full",
          )}
          style={{ borderRight: '1px solid rgba(0,0,0,0.06)', boxShadow: '4px 0 24px rgba(0,0,0,0.08)' }}
        >
          <SidebarContent onNavigate={() => setSidebarOpen(false)} />
        </aside>
      </>
    );
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="hidden w-60 shrink-0 md:block"
        style={{ borderRight: '1px solid rgba(0,0,0,0.06)', background: '#fafafa' }}
      >
        <SidebarContent />
      </aside>

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 bg-white transition-transform duration-300 ease-in-out md:hidden",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
        style={{ borderRight: '1px solid rgba(0,0,0,0.06)', boxShadow: '4px 0 24px rgba(0,0,0,0.08)' }}
      >
        <SidebarContent onNavigate={() => setSidebarOpen(false)} />
      </aside>
    </>
  );
}
