"use client";

import { LogOut, Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useUiStore } from "@/store/uiStore";

export function Header() {
  const { user, logout } = useAuth();
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const hideHeader = useUiStore((s) => s.hideHeader);

  if (hideHeader) return null;

  return (
    <header
      className="flex h-14 items-center justify-between px-6"
      style={{
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        background: 'white',
      }}
    >
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={toggleSidebar}
          aria-label="Открыть меню"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div
          style={{
            fontSize: '13px',
            color: '#8e8e93',
            fontWeight: 400,
          }}
        >
          {user?.email}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => logout()}
          className="cursor-pointer"
          aria-label="Выйти"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
            color: '#8e8e93',
            background: 'transparent',
            border: '1px solid rgba(0,0,0,0.08)',
            borderRadius: '8px',
            padding: '5px 10px',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = '#171717';
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0,0,0,0.14)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = '#8e8e93';
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0,0,0,0.08)';
          }}
        >
          <LogOut className="h-3.5 w-3.5" />
          Выйти
        </button>
      </div>
    </header>
  );
}
