"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CreditCard, Gift, Settings, TrendingUp, Users } from "lucide-react";

import { TrialBanner } from "@/components/billing/TrialBanner";
import { EmailBanner } from "@/components/EmailBanner";
import { referralsApi } from "@/api/referrals";
import { formatMoney } from "@/lib/utils";

export default function DashboardPage() {
  const { data: stats } = useQuery({
    queryKey: ["referrals-stats"],
    queryFn: () => referralsApi.stats(),
  });

  const statCards = [
    {
      label: "Заработано рефералами",
      value: formatMoney(stats?.total_earned ?? 0),
      sub: `Приглашено: ${stats?.total_referred ?? 0}`,
      icon: TrendingUp,
      color: '#0066FF',
      bg: 'rgba(0,102,255,0.08)',
    },
    {
      label: "Ожидает выплаты",
      value: formatMoney(stats?.pending_payout ?? 0),
      sub: `Оплатили: ${stats?.converted ?? 0}`,
      icon: Users,
      color: '#10b981',
      bg: 'rgba(16,185,129,0.08)',
    },
  ];

  const quickActions = [
    { href: "/billing",   icon: CreditCard, label: "Подписка",   color: '#0066FF', bg: 'rgba(0,102,255,0.08)' },
    { href: "/referrals", icon: Gift,       label: "Рефералы",   color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
    { href: "/settings",  icon: Settings,   label: "Настройки",  color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)' },
  ];

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1
          style={{
            fontSize: '28px',
            fontWeight: 800,
            color: '#171717',
            letterSpacing: '-0.025em',
            marginBottom: '4px',
          }}
        >
          Главная
        </h1>
        <p style={{ fontSize: '14px', color: '#8e8e93' }}>
          Сводка по вашему аккаунту
        </p>
      </div>

      <EmailBanner />
      <TrialBanner />

      {/* Stats grid */}
      <div className="grid gap-4 md:grid-cols-2" style={{ marginBottom: '24px' }}>
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              style={{
                background: 'white',
                border: '1px solid rgba(0,0,0,0.07)',
                borderRadius: '16px',
                padding: '24px',
                boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '16px',
              }}
            >
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: card.bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Icon size={20} color={card.color} strokeWidth={1.75} />
              </div>
              <div>
                <div style={{ fontSize: '13px', color: '#8e8e93', marginBottom: '4px' }}>
                  {card.label}
                </div>
                <div
                  style={{
                    fontSize: '26px',
                    fontWeight: 800,
                    color: '#171717',
                    letterSpacing: '-0.025em',
                    lineHeight: 1.1,
                    marginBottom: '4px',
                  }}
                >
                  {card.value}
                </div>
                <div style={{ fontSize: '12px', color: '#9e9ea8' }}>{card.sub}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick actions */}
      <div
        style={{
          background: 'white',
          border: '1px solid rgba(0,0,0,0.07)',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
        }}
      >
        <div
          style={{
            fontSize: '15px',
            fontWeight: 700,
            color: '#171717',
            letterSpacing: '-0.015em',
            marginBottom: '16px',
          }}
        >
          Быстрые действия
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {quickActions.map((q) => {
            const Icon = q.icon;
            return (
              <Link
                key={q.href}
                href={q.href}
                style={{ textDecoration: 'none' }}
              >
                <div
                  className="quick-action-card"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '14px 16px',
                    borderRadius: '12px',
                    border: '1px solid rgba(0,0,0,0.06)',
                    background: '#fafafa',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: q.bg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={18} color={q.color} strokeWidth={1.75} />
                  </div>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#171717', letterSpacing: '-0.01em' }}>
                    {q.label}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <style jsx>{`
        .quick-action-card:hover {
          border-color: rgba(0, 102, 255, 0.2);
          background: white;
          transform: translateY(-1px);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
        }
      `}</style>
    </div>
  );
}
