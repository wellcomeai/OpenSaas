"use client";

import { Check } from 'lucide-react';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { useTilt } from '@/hooks/useTilt';

const features = [
  'Email + подтверждение кодом на почте',
  'Сброс пароля по ссылке',
  'JWT токены с автообновлением',
  'Пробный период — 3 дня бесплатно',
];

export function AuthSection() {
  const sectionRef = useScrollReveal();
  const tilt = useTilt(2);

  return (
    <section
      ref={sectionRef as React.RefObject<HTMLElement>}
      className="reveal"
      style={{
        background: 'linear-gradient(180deg, #ffffff 0%, #f5f5f7 100%)',
        padding: '120px 0',
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px' }}>
        <div className="grid md:grid-cols-2 gap-16 items-center">
          {/* Left column — text */}
          <div>
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
              01 / РЕГИСТРАЦИЯ
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
              Авторизация готова с первого запуска
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

          {/* Right column — form mockup */}
          <div
            ref={tilt.ref}
            onMouseMove={tilt.handleMouseMove}
            onMouseEnter={tilt.handleMouseEnter}
            onMouseLeave={tilt.handleMouseLeave}
            className="auth-mockup"
            style={{
              background: 'white',
              borderRadius: '20px',
              border: '1px solid rgba(0,0,0,0.06)',
              boxShadow: '0 24px 60px rgba(0,0,0,0.08)',
              padding: '40px 36px',
              maxWidth: '420px',
              margin: '0 auto',
              width: '100%',
              willChange: 'transform',
            }}
          >
            <h3
              className="auth-anim-item auth-delay-0"
              style={{
                fontSize: '22px',
                fontWeight: 700,
                color: '#171717',
                letterSpacing: '-0.02em',
                marginBottom: '24px',
                textAlign: 'center',
              }}
            >
              Добро пожаловать
            </h3>

            <div className="auth-anim-item auth-delay-1" style={{ marginBottom: '14px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '12px',
                  color: '#616161',
                  fontWeight: 500,
                  marginBottom: '6px',
                }}
              >
                Email
              </label>
              <div
                style={{
                  border: '1px solid rgba(0,0,0,0.1)',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  fontSize: '14px',
                  color: '#8e8e93',
                  background: '#fafafa',
                }}
              >
                you@company.com
              </div>
            </div>

            <div className="auth-anim-item auth-delay-2" style={{ marginBottom: '20px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '12px',
                  color: '#616161',
                  fontWeight: 500,
                  marginBottom: '6px',
                }}
              >
                Пароль
              </label>
              <div
                style={{
                  border: '1px solid rgba(0,0,0,0.1)',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  fontSize: '14px',
                  color: '#8e8e93',
                  background: '#fafafa',
                  letterSpacing: '0.2em',
                }}
              >
                ••••••••••
              </div>
            </div>

            <button
              className="auth-anim-item auth-delay-3"
              style={{
                width: '100%',
                background: '#0066FF',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                padding: '12px',
                fontSize: '15px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(0, 102, 255, 0.3)',
                marginBottom: '14px',
              }}
            >
              Войти
            </button>

            <div
              className="auth-anim-item auth-delay-4"
              style={{
                textAlign: 'center',
                fontSize: '13px',
              }}
            >
              <span style={{ color: '#0066FF', cursor: 'pointer' }}>Забыли пароль?</span>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes auth-slide-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .auth-anim-item { opacity: 0; }
        :global(.reveal.visible) .auth-anim-item {
          animation: auth-slide-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        :global(.reveal.visible) .auth-delay-0 { animation-delay: 0.0s; }
        :global(.reveal.visible) .auth-delay-1 { animation-delay: 0.08s; }
        :global(.reveal.visible) .auth-delay-2 { animation-delay: 0.16s; }
        :global(.reveal.visible) .auth-delay-3 { animation-delay: 0.24s; }
        :global(.reveal.visible) .auth-delay-4 { animation-delay: 0.32s; }
      `}</style>
    </section>
  );
}
