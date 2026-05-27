"use client";

import { Check } from 'lucide-react';
import { useScrollReveal } from '@/hooks/useScrollReveal';

const features = [
  'Просто вставьте ключи в .env файл',
  'Webhook обрабатывает платежи автоматически',
  'История всех транзакций в админке',
  'Пробный период и подписки работают сразу',
];

type LineKind = 'comment' | 'highlight' | 'plain';

const envLines: { text: string; kind: LineKind }[] = [
  { text: '# РОБОКАССА',                              kind: 'comment'   },
  { text: 'ROBOKASSA_MERCHANT_LOGIN=ваш_логин',       kind: 'highlight' },
  { text: 'ROBOKASSA_PASSWORD1=пароль1',              kind: 'highlight' },
  { text: 'ROBOKASSA_PASSWORD2=пароль2',              kind: 'highlight' },
  { text: 'ROBOKASSA_TEST_MODE=false',                kind: 'plain'     },
  { text: '',                                         kind: 'plain'     },
  { text: '# ГОТОВО ✓',                               kind: 'comment'   },
];

export function PaymentsSection() {
  const sectionRef = useScrollReveal();

  return (
    <section
      ref={sectionRef as React.RefObject<HTMLElement>}
      className="reveal"
      style={{
        background: 'linear-gradient(180deg, #f5f5f7 0%, #ffffff 100%)',
        padding: '120px 0',
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px' }}>
        <div className="grid md:grid-cols-2 gap-16 items-center">
          {/* Left column — .env mockup */}
          <div className="order-2 md:order-1">
            <div
              style={{
                background: '#0a0a0a',
                borderRadius: '16px',
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.06)',
                boxShadow: '0 24px 60px rgba(0,0,0,0.15)',
              }}
            >
              {/* Terminal header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 16px',
                  borderBottom: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ff5f57' }} />
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#febc2e' }} />
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#28c840' }} />
                <span
                  style={{
                    marginLeft: '8px',
                    fontSize: '12px',
                    color: 'rgba(255,255,255,0.4)',
                    fontFamily: 'Geist Mono, monospace',
                  }}
                >
                  .env
                </span>
              </div>

              {/* .env body */}
              <div
                style={{
                  padding: '20px 0',
                  fontFamily: 'Geist Mono, Fira Code, monospace',
                  fontSize: '13px',
                  lineHeight: '1.9',
                }}
              >
                {envLines.map((line, i) => {
                  const isHighlight = line.kind === 'highlight';
                  const isComment = line.kind === 'comment';
                  return (
                    <div
                      key={i}
                      className="env-line"
                      style={{
                        padding: '0 24px 0 22px',
                        borderLeft: isHighlight ? '2px solid #0066FF' : '2px solid transparent',
                        background: isHighlight ? 'rgba(0,102,255,0.15)' : 'transparent',
                        color: isComment ? '#6b7280' : isHighlight ? '#cfe2ff' : '#e5e5e5',
                        minHeight: '24px',
                        animationDelay: `${0.15 + i * 0.1}s`,
                      }}
                    >
                      {line.text || ' '}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right column — text */}
          <div className="order-1 md:order-2">
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
              02 / ПЛАТЕЖИ
            </div>
            <h2
              style={{
                fontSize: 'clamp(2rem, 4vw, 3.25rem)',
                fontWeight: 800,
                letterSpacing: '-0.025em',
                lineHeight: '1.05',
                color: '#171717',
                marginBottom: '32px',
              }}
            >
              Робокасса уже интегрирована
            </h2>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {features.map((f) => (
                <li
                  key={f}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 0',
                    fontSize: '16px',
                    color: '#3a3a3e',
                  }}
                >
                  <span
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: 'rgba(0,102,255,0.1)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Check size={14} color="#0066FF" strokeWidth={3} />
                  </span>
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <style jsx>{`
        .env-line { opacity: 0; }
        :global(.reveal.visible) .env-line {
          animation: type-in 0.25s ease forwards;
        }
      `}</style>
    </section>
  );
}
