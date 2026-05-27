"use client";

import Link from "next/link";
import { Check, Zap } from "lucide-react";
import { formatMoney } from "@/lib/utils";
import { usePlans } from "@/hooks/useBilling";

export function Pricing() {
  const { data: plans, isLoading } = usePlans();

  const fallback = [
    {
      name: "Trial",
      price: "0",
      currency: "RUB",
      badge: null,
      description: "Попробуйте без риска",
      features: ["3 дня бесплатно", "Все возможности", "Без кредитной карты"],
      ctaLabel: "Начать триал",
      highlight: false,
    },
    {
      name: "Basic",
      price: "990",
      currency: "RUB",
      badge: null,
      description: "Для небольших проектов",
      features: ["До 100 запросов в день", "Email поддержка", "Базовая аналитика"],
      ctaLabel: "Подписаться",
      highlight: false,
    },
    {
      name: "Pro",
      price: "2990",
      currency: "RUB",
      badge: "Популярный",
      description: "Для растущего бизнеса",
      features: [
        "Безлимит запросов",
        "Приоритетная поддержка",
        "API доступ",
        "Расширенная аналитика",
      ],
      ctaLabel: "Подписаться",
      highlight: true,
    },
  ];

  const items =
    plans && plans.length > 0
      ? [
          {
            name: "Trial",
            price: "0",
            currency: "RUB",
            badge: null,
            description: "Попробуйте без риска",
            features: ["3 дня бесплатно", "Все возможности"],
            ctaLabel: "Начать",
            highlight: false,
          },
          ...plans.map((p, i) => ({
            name: p.name,
            price: p.price,
            currency: p.currency,
            badge: i === plans.length - 1 ? "Популярный" : null,
            description: i === plans.length - 1 ? "Для растущего бизнеса" : "Для небольших проектов",
            features: p.features,
            ctaLabel: "Подписаться",
            highlight: i === plans.length - 1,
          })),
        ]
      : fallback;

  return (
    <section id="pricing" style={{ position: 'relative', overflow: 'hidden', padding: '120px 0', background: '#f5f5f7' }}>
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '50%',
          left: '-150px',
          transform: 'translateY(-50%)',
          width: '450px',
          height: '450px',
          borderRadius: '50%',
          background: 'rgba(0,102,255,0.07)',
          filter: 'blur(70px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          bottom: '-100px',
          right: '-80px',
          width: '300px',
          height: '300px',
          borderRadius: '50%',
          background: 'rgba(245,158,11,0.04)',
          filter: 'blur(50px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: '1100px', margin: '0 auto', padding: '0 24px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <div
            style={{
              fontSize: '12px',
              color: '#0066FF',
              fontWeight: 600,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              marginBottom: '16px',
            }}
          >
            ТАРИФЫ
          </div>
          <h2
            style={{
              fontSize: 'clamp(2rem, 4vw, 3.5rem)',
              fontWeight: 800,
              letterSpacing: '-0.025em',
              lineHeight: '1.05',
              color: '#171717',
              marginBottom: '16px',
            }}
          >
            Простые тарифы
          </h2>
          <p
            style={{
              fontSize: '18px',
              color: '#616161',
              lineHeight: '1.6',
              maxWidth: '480px',
              margin: '0 auto',
            }}
          >
            Без скрытых платежей. Отмена в любой момент.
          </p>
        </div>

        {/* Cards */}
        {isLoading ? (
          <div style={{ textAlign: 'center', color: '#8e8e93', fontSize: '14px', padding: '40px 0' }}>
            Загрузка тарифов…
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '16px',
              alignItems: 'center',
            }}
          >
            {items.map((plan) => (
              <div
                key={plan.name}
                style={{
                  position: 'relative',
                  background: plan.highlight
                    ? 'linear-gradient(145deg, #0052d4 0%, #4364f7 50%, #6fb1fc 100%)'
                    : 'white',
                  borderRadius: '20px',
                  padding: '32px',
                  border: plan.highlight ? 'none' : '1px solid rgba(0,0,0,0.07)',
                  boxShadow: plan.highlight
                    ? '0 20px 60px rgba(0,102,255,0.25), 0 0 0 1px rgba(255,255,255,0.1) inset'
                    : '0 2px 20px rgba(0,0,0,0.04)',
                  transform: plan.highlight ? 'translateY(-8px)' : 'none',
                  transition: 'all 0.3s ease',
                }}
              >
                {/* Badge */}
                {plan.badge && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '-13px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: 'white',
                      color: '#0066FF',
                      fontSize: '11px',
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      padding: '4px 14px',
                      borderRadius: '20px',
                      boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                      whiteSpace: 'nowrap',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    <Zap size={10} strokeWidth={2.5} />
                    {plan.badge}
                  </div>
                )}

                {/* Plan name */}
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: plan.highlight ? 'rgba(255,255,255,0.65)' : '#8e8e93',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    marginBottom: '6px',
                  }}
                >
                  {plan.name}
                </div>

                {/* Description */}
                <div
                  style={{
                    fontSize: '14px',
                    color: plan.highlight ? 'rgba(255,255,255,0.75)' : '#616161',
                    marginBottom: '20px',
                    lineHeight: '1.5',
                  }}
                >
                  {plan.description}
                </div>

                {/* Price */}
                <div style={{ marginBottom: '24px' }}>
                  <span
                    style={{
                      fontSize: '40px',
                      fontWeight: 800,
                      color: plan.highlight ? 'white' : '#171717',
                      letterSpacing: '-0.03em',
                      lineHeight: 1,
                    }}
                  >
                    {plan.price === "0" ? "Бесплатно" : formatMoney(plan.price, plan.currency)}
                  </span>
                  {plan.price !== "0" && (
                    <span
                      style={{
                        fontSize: '14px',
                        color: plan.highlight ? 'rgba(255,255,255,0.55)' : '#8e8e93',
                        marginLeft: '6px',
                      }}
                    >
                      / мес
                    </span>
                  )}
                </div>

                {/* Divider */}
                <div
                  style={{
                    height: '1px',
                    background: plan.highlight ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.06)',
                    marginBottom: '20px',
                  }}
                />

                {/* Features */}
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px' }}>
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '6px 0',
                        fontSize: '14px',
                        color: plan.highlight ? 'rgba(255,255,255,0.88)' : '#3a3a3e',
                      }}
                    >
                      <span
                        style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          background: plan.highlight ? 'rgba(255,255,255,0.2)' : 'rgba(0,102,255,0.1)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Check size={10} color={plan.highlight ? 'white' : '#0066FF'} strokeWidth={3} />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Link href="/register" style={{ display: 'block', textDecoration: 'none' }}>
                  <button
                    type="button"
                    style={{
                      width: '100%',
                      background: plan.highlight ? 'white' : '#171717',
                      color: plan.highlight ? '#0052d4' : 'white',
                      border: 'none',
                      borderRadius: '12px',
                      height: '46px',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      letterSpacing: '-0.01em',
                      boxShadow: plan.highlight
                        ? '0 4px 14px rgba(0,0,0,0.12)'
                        : '0 4px 14px rgba(0,0,0,0.12)',
                      transition: 'all 0.2s ease',
                    }}
                    className="pricing-btn"
                  >
                    {plan.ctaLabel}
                  </button>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .pricing-btn:hover {
          opacity: 0.92;
          transform: translateY(-1px);
        }
      `}</style>
    </section>
  );
}
