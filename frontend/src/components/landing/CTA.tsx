"use client";

import Link from "next/link";
import { Send } from "lucide-react";

export function CTA() {
  return (
    <section
      style={{
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(180deg, #b3ccff 0%, #8eb3f0 18%, #4a90e2 45%, #1a5fd4 72%, #0a3fa8 100%)',
        padding: 'clamp(140px, 16vw, 200px) 24px clamp(100px, 14vw, 160px)',
        marginTop: '-1px',
        textAlign: 'center',
      }}
    >
      {/* Glow orbs */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: '28%',
          left: '12%',
          width: '440px',
          height: '440px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.16) 0%, transparent 70%)',
          filter: 'blur(70px)',
          pointerEvents: 'none',
        }}
      />
      <div
        aria-hidden
        style={{
          position: 'absolute',
          bottom: '-80px',
          right: '8%',
          width: '380px',
          height: '380px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139,92,246,0.22) 0%, transparent 70%)',
          filter: 'blur(70px)',
          pointerEvents: 'none',
        }}
      />
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: '40%',
          right: '38%',
          width: '220px',
          height: '220px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 70%)',
          filter: 'blur(50px)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '760px', margin: '0 auto' }}>
        <h2
          style={{
            fontSize: 'clamp(2.5rem, 5vw, 4rem)',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            lineHeight: '1.05',
            color: 'white',
            marginBottom: '16px',
          }}
        >
          Начни прямо сейчас
        </h2>

        <p
          style={{
            fontSize: '18px',
            color: 'rgba(255,255,255,0.85)',
            marginBottom: '40px',
            lineHeight: '1.6',
            maxWidth: '520px',
            margin: '0 auto 40px',
          }}
        >
          Шаблон + 5 уроков. Один платёж — навсегда.
        </p>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            flexWrap: 'wrap',
            marginBottom: '28px',
          }}
        >
          <Link
            href="#"
            className="inline-flex items-center gap-2 text-[#0a3fa8] rounded-xl px-7 no-underline tracking-tight transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_8px_24px_rgba(0,0,0,0.18)]"
            style={{
              background: 'white',
              height: '52px',
              fontSize: '15px',
              fontWeight: 600,
              boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
            }}
          >
            <span aria-hidden>💳</span>
            Купить за 3000₽
          </Link>

          <a
            href="https://t.me/wellcome_ai"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-white rounded-xl px-7 no-underline tracking-tight transition-all duration-200 hover:scale-[1.02] hover:bg-white/20"
            style={{
              background: 'rgba(255,255,255,0.14)',
              border: '1px solid rgba(255,255,255,0.25)',
              backdropFilter: 'blur(8px)',
              height: '52px',
              fontSize: '15px',
              fontWeight: 600,
            }}
          >
            <Send size={16} />
            Автор шаблона
          </a>
        </div>

        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
          Разовая оплата · Доступ навсегда · Без подписки
        </p>
      </div>
    </section>
  );
}
