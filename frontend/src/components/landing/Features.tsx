"use client";

import {
  Lock, CreditCard, Key, Gift, Database, Shield, Bell, Mail, Box,
} from "lucide-react";
import { useTilt } from "@/hooks/useTilt";
import { useScrollReveal } from "@/hooks/useScrollReveal";

interface BentoCardProps {
  icon: React.ReactNode;
  title: string;
  desc: string;
  decor?: React.ReactNode;
  large?: boolean;
}

function BentoCard({ icon, title, desc, decor, large }: BentoCardProps) {
  const { ref, handleMouseMove, handleMouseLeave, handleMouseEnter } = useTilt(3);

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseEnter={handleMouseEnter}
      className={`bento-card ${large ? 'md:col-span-2' : ''}`}
      style={{ padding: '28px', willChange: 'transform', position: 'relative', minHeight: large ? '220px' : '180px' }}
    >
      <div style={{ color: '#0066FF', marginBottom: '16px' }}>{icon}</div>
      <div style={{ fontSize: '17px', fontWeight: 700, color: '#171717', marginBottom: '8px', letterSpacing: '-0.01em' }}>
        {title}
      </div>
      <p style={{ fontSize: '14px', color: '#616161', lineHeight: '1.6', margin: 0 }}>
        {desc}
      </p>
      {decor && (
        <div style={{ marginTop: '16px' }}>
          {decor}
        </div>
      )}
    </div>
  );
}

const LoginDecor = () => (
  <div
    style={{
      background: '#f5f5f7',
      borderRadius: '10px',
      padding: '14px',
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#616161',
      border: '1px solid rgba(0,0,0,0.06)',
    }}
  >
    <div style={{ marginBottom: '8px', color: '#8e8e93' }}>{'// JWT Auth'}</div>
    <div><span style={{ color: '#0066FF' }}>POST</span> /auth/login</div>
    <div><span style={{ color: '#0066FF' }}>POST</span> /auth/refresh</div>
    <div><span style={{ color: '#0066FF' }}>POST</span> /auth/verify-email</div>
  </div>
);

const ApiKeyDecor = () => (
  <div
    style={{
      background: '#0a0a0a',
      borderRadius: '8px',
      padding: '12px 16px',
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#34d399',
    }}
  >
    osk_live_a1b2c3d4e5f6...
  </div>
);

const ReferralDecor = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
    {['You', '→', 'Friend', '→', '+20%'].map((item, i) => (
      <span
        key={i}
        style={{
          padding: item === '→' ? '0' : '4px 12px',
          borderRadius: '20px',
          background: item === '→' ? 'transparent' : item === '+20%' ? '#0066FF' : '#f5f5f7',
          color: item === '+20%' ? 'white' : item === '→' ? '#8e8e93' : '#171717',
          fontSize: '12px',
          fontWeight: 500,
          border: item === '→' || item === '+20%' ? 'none' : '1px solid rgba(0,0,0,0.08)',
        }}
      >
        {item}
      </span>
    ))}
  </div>
);

const DockerDecor = () => (
  <div
    style={{
      background: '#0a0a0a',
      borderRadius: '8px',
      padding: '12px 16px',
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#e5e5e5',
    }}
  >
    <span style={{ color: '#8e8e93' }}>$ </span>docker-compose up -d
  </div>
);

export function BentoFeaturesSection() {
  const sectionRef = useScrollReveal();

  return (
    <section
      id="features"
      ref={sectionRef as React.RefObject<HTMLElement>}
      className="reveal"
      style={{
        background: 'linear-gradient(180deg, #f5f5f7 0%, #ffffff 100%)',
        padding: '120px 0',
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px' }}>
        {/* Header */}
        <div className="text-center mb-16">
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
            02 / ВОЗМОЖНОСТИ
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
            Всё, что нужно — уже внутри
          </h2>
          <p style={{ fontSize: '18px', color: '#616161', maxWidth: '480px', margin: '0 auto', lineHeight: '1.6' }}>
            Не трать время на инфраструктуру. Сосредоточься на бизнес-логике.
          </p>
        </div>

        {/* Bento Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '16px',
          }}
          className="bento-grid"
        >
          <BentoCard
            icon={<Lock size={24} />}
            title="Аутентификация"
            desc="JWT, refresh-токены, email-подтверждение с кодом, сброс пароля."
            decor={<LoginDecor />}
            large
          />
          <BentoCard
            icon={<CreditCard size={24} />}
            title="Биллинг"
            desc="Робокасса, подписки, trial-период. История платежей."
          />
          <BentoCard
            icon={<Shield size={24} />}
            title="Админка"
            desc="Управление пользователями, платежами, выплатами и статистикой."
          />
          <BentoCard
            icon={<Key size={24} />}
            title="API-ключи"
            desc="Скоупы, rate limit, безопасное хранение через bcrypt."
            decor={<ApiKeyDecor />}
            large
          />
          <BentoCard
            icon={<Gift size={24} />}
            title="Реферальная программа"
            desc="Коды, ссылки, выплаты 20% с каждого платежа приглашённого."
            decor={<ReferralDecor />}
          />
          <BentoCard
            icon={<Database size={24} />}
            title="Миграции Alembic"
            desc="10 готовых миграций. История изменений схемы базы данных."
          />
          <BentoCard
            icon={<Box size={24} />}
            title="Redis / PG fallback"
            desc="Rate limiting без обязательного Redis — PostgreSQL fallback работает из коробки."
          />
          <BentoCard
            icon={<Mail size={24} />}
            title="Email"
            desc="SMTP + Jinja2 шаблоны, dev-режим без реальной отправки писем."
          />
          <BentoCard
            icon={<Bell size={24} />}
            title="Docker"
            desc="Один Dockerfile, supervisord, nginx. docker-compose up и всё готово."
            decor={<DockerDecor />}
          />
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 768px) {
          .bento-grid {
            grid-template-columns: 1fr !important;
          }
          .bento-grid > div {
            grid-column: span 1 !important;
          }
        }
      `}</style>
    </section>
  );
}

export { BentoFeaturesSection as Features };
