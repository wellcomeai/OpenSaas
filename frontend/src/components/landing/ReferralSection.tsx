"use client";

import { useState } from 'react';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { Copy, Check, User, Users } from 'lucide-react';

const features = [
  'Уникальные реферальные ссылки для каждого пользователя',
  'Статистика в личном кабинете',
  'Выплаты через админ-панель',
];

export function ReferralSection() {
  const sectionRef = useScrollReveal();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText('opensaas.app/ref/YOUR_CODE');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section
      ref={sectionRef as React.RefObject<HTMLElement>}
      className="reveal"
      style={{
        background: 'linear-gradient(180deg, #ffffff 0%, #f5f5f7 100%)',
        padding: '120px 0',
      }}
    >
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 24px', textAlign: 'center' }}>
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
          03 / РЕФЕРАЛЫ
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
          Встроенная реферальная программа
        </h2>

        <p style={{ fontSize: '18px', color: '#616161', lineHeight: '1.6', marginBottom: '72px' }}>
          20% с каждого платежа приглашённого — автоматически
        </p>

        {/* Flow diagram */}
        <div
          className="ref-flow"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            flexWrap: 'wrap',
            marginBottom: '64px',
          }}
        >
          <FlowBlock icon={<User size={24} />} label="ВЫ" delay={0} />
          <FlowArrow delay={0.2} />
          <FlowBlock icon={<Users size={24} />} label="ДРУГ" delay={0.2} />
          <FlowArrow delay={0.4} />
          <FlowBlock label="+20%" delay={0.4} accent />
        </div>

        {/* Feature list */}
        <ul
          style={{
            listStyle: 'none',
            padding: 0,
            margin: '0 auto 48px',
            maxWidth: '480px',
            textAlign: 'left',
          }}
        >
          {features.map((f) => (
            <li
              key={f}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 0',
                fontSize: '15px',
                color: '#3a3a3e',
              }}
            >
              <span
                style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  background: 'rgba(0,102,255,0.1)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Check size={12} color="#0066FF" strokeWidth={3} />
              </span>
              {f}
            </li>
          ))}
        </ul>

        {/* Referral link mockup */}
        <div
          style={{
            border: '1.5px solid rgba(0,102,255,0.2)',
            borderRadius: '12px',
            background: '#EBF3FF',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap',
            maxWidth: '560px',
            margin: '0 auto',
          }}
        >
          <span
            style={{
              fontFamily: 'Geist Mono, monospace',
              fontSize: '14px',
              color: '#0066FF',
              letterSpacing: '0.02em',
            }}
          >
            opensaas.app/ref/YOUR_CODE
          </span>
          <button
            onClick={handleCopy}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: copied ? '#0066FF' : 'white',
              color: copied ? 'white' : '#171717',
              border: '1px solid rgba(0,0,0,0.1)',
              borderRadius: '8px',
              padding: '8px 14px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap',
            }}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Скопировано!' : 'Скопировать'}
          </button>
        </div>
      </div>

      <style jsx global>{`
        .ref-block {
          opacity: 0;
          transform: translateY(8px);
        }
        .reveal.visible .ref-block {
          animation: ref-block-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .ref-arrow-line {
          transform-origin: left center;
          transform: scaleX(0);
        }
        .reveal.visible .ref-arrow-line {
          animation: draw-line 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes ref-block-in {
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  );
}

function FlowBlock({
  icon,
  label,
  delay,
  accent,
}: {
  icon?: React.ReactNode;
  label: string;
  delay: number;
  accent?: boolean;
}) {
  return (
    <div
      className="ref-block"
      style={{
        background: accent ? '#0066FF' : 'white',
        color: accent ? 'white' : '#171717',
        border: accent ? 'none' : '1px solid rgba(0,0,0,0.08)',
        borderRadius: '16px',
        padding: '20px 24px',
        minWidth: '120px',
        boxShadow: accent ? '0 10px 30px rgba(0,102,255,0.3)' : '0 4px 14px rgba(0,0,0,0.04)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
        animationDelay: `${delay}s`,
      }}
    >
      {icon && (
        <span style={{ color: accent ? 'white' : '#0066FF', display: 'inline-flex' }}>{icon}</span>
      )}
      <span
        style={{
          fontSize: accent ? '20px' : '14px',
          fontWeight: 700,
          letterSpacing: accent ? '-0.02em' : '0.05em',
        }}
      >
        {label}
      </span>
    </div>
  );
}

function FlowArrow({ delay }: { delay: number }) {
  return (
    <div
      className="ref-arrow"
      style={{
        display: 'flex',
        alignItems: 'center',
        width: '48px',
        height: '2px',
        transitionDelay: `${delay}s`,
      }}
    >
      <div
        className="ref-arrow-line"
        style={{
          width: '100%',
          height: '2px',
          background: 'linear-gradient(90deg, rgba(0,102,255,0.4), rgba(0,102,255,0.8))',
          animationDelay: `${delay}s`,
        }}
      />
    </div>
  );
}
