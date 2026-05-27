"use client";

import Link from "next/link";
import { Send, Zap } from "lucide-react";
import { motion } from "framer-motion";

const itemVariants = {
  hidden:  { opacity: 0, y: 24 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as [number, number, number, number], delay },
  }),
};

const stats = [
  { label: 'Пользователи', value: '2,847', change: '+12%', color: '#0066FF', barColor: 'rgba(0,102,255,0.12)' },
  { label: 'Выручка',      value: '₽48K',   change: '+8%',  color: '#10b981', barColor: 'rgba(16,185,129,0.12)' },
  { label: 'Активных',    value: '1,203',   change: '+5%',  color: '#f59e0b', barColor: 'rgba(245,158,11,0.12)' },
  { label: 'API запросов', value: '89.2K',  change: '+23%', color: '#8b5cf6', barColor: 'rgba(139,92,246,0.12)' },
];

export function Hero() {
  return (
    <section
      className="relative overflow-hidden noise"
      style={{ paddingTop: '160px', paddingBottom: '120px' }}
    >
      {/* Mesh background */}
      <div className="absolute inset-0 mesh-bg" style={{ zIndex: 0 }} />

      {/* Static gradient orbs (paint once, no scroll jank) */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          width: '520px',
          height: '520px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,102,255,0.38) 0%, rgba(0,102,255,0.12) 40%, transparent 70%)',
          filter: 'blur(50px)',
          top: '-140px',
          left: '6%',
          zIndex: 0,
          pointerEvents: 'none',
        }}
      />
      <div
        aria-hidden
        style={{
          position: 'absolute',
          width: '580px',
          height: '580px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139,92,246,0.34) 0%, rgba(139,92,246,0.1) 45%, transparent 70%)',
          filter: 'blur(55px)',
          top: '-40px',
          right: '0%',
          zIndex: 0,
          pointerEvents: 'none',
        }}
      />
      <div
        aria-hidden
        style={{
          position: 'absolute',
          width: '480px',
          height: '480px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,179,237,0.4) 0%, rgba(99,179,237,0.12) 40%, transparent 70%)',
          filter: 'blur(55px)',
          bottom: '-120px',
          left: '38%',
          zIndex: 0,
          pointerEvents: 'none',
        }}
      />

      {/* Subtle dot grid */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.06) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          zIndex: 0,
          WebkitMaskImage: 'radial-gradient(ellipse 80% 70% at 50% 50%, black 40%, transparent 100%)',
          maskImage: 'radial-gradient(ellipse 80% 70% at 50% 50%, black 40%, transparent 100%)',
        }}
      />

      {/* Bottom fade to white — seamless transition to next section */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: '260px',
          background:
            'linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.7) 55%, #ffffff 100%)',
          zIndex: 0,
          pointerEvents: 'none',
        }}
      />

      <div
        className="relative mx-auto text-center px-6"
        style={{ maxWidth: '900px', zIndex: 1 }}
      >
        {/* Pill badge */}
        <motion.div
          custom={0}
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          className="flex justify-center mb-8"
        >
          <div
            className="inline-flex items-center gap-2 border border-black/10 rounded-full px-4 py-1.5 text-[13px] text-[#616161] bg-white/80 backdrop-blur-md"
          >
            <Zap size={12} strokeWidth={2.5} />
            <span>Шаблон + 5 уроков · Запуск за выходные</span>
          </div>
        </motion.div>

        {/* Headline */}
        <motion.h1
          custom={0}
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          style={{
            fontSize: 'clamp(3rem, 7vw, 6rem)',
            lineHeight: '1',
            letterSpacing: '-0.04em',
            fontWeight: 800,
            color: '#171717',
            marginBottom: '24px',
          }}
        >
          Создай свою
          <br />
          <span className="gradient-text">онлайн платформу</span> за выходные
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          custom={0.15}
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          className="mx-auto"
          style={{
            fontSize: '18px',
            color: '#616161',
            maxWidth: '580px',
            lineHeight: '1.65',
            marginBottom: '40px',
          }}
        >
          Готовый шаблон + видеоуроки по запуску.
          <br />
          Без найма разработчика.
        </motion.p>

        {/* CTA buttons */}
        <motion.div
          custom={0.3}
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-wrap items-center justify-center gap-3"
          style={{ marginBottom: '64px' }}
        >
          <Link href="#" className="btn-primary-new">
            <span aria-hidden>💳</span>
            Купить за 3000₽
          </Link>
          <Link
            href="https://t.me/wellcome_ai"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary-new"
          >
            <Send size={15} />
            Автор шаблона
          </Link>
        </motion.div>

        {/* Dashboard preview */}
        <motion.div
          custom={0.3}
          variants={itemVariants}
          initial="hidden"
          animate="visible"
        >
          <div
            className="mx-auto"
            style={{
              borderRadius: '20px',
              border: '1px solid rgba(0,0,0,0.08)',
              boxShadow: '0 0 0 1px rgba(255,255,255,0.6) inset, 0 24px 80px rgba(0,0,0,0.12)',
              overflow: 'hidden',
              background: '#fafafa',
              maxWidth: '860px',
            }}
          >
            {/* Browser chrome */}
            <div
              style={{
                background: '#f0f0f2',
                padding: '10px 16px',
                borderBottom: '1px solid rgba(0,0,0,0.06)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', gap: '5px' }}>
                <div style={{ width: '11px', height: '11px', borderRadius: '50%', background: '#ff5f57' }} />
                <div style={{ width: '11px', height: '11px', borderRadius: '50%', background: '#febc2e' }} />
                <div style={{ width: '11px', height: '11px', borderRadius: '50%', background: '#28c840' }} />
              </div>
              <div
                style={{
                  flex: 1,
                  background: 'white',
                  borderRadius: '6px',
                  padding: '4px 12px',
                  fontSize: '11.5px',
                  color: '#9e9ea8',
                  fontFamily: 'Geist Mono, monospace',
                  border: '1px solid rgba(0,0,0,0.06)',
                }}
              >
                app.opensaas.dev/dashboard
              </div>
            </div>

            {/* Dashboard body */}
            <div style={{ display: 'flex', background: '#fafafa' }}>
              {/* Sidebar strip */}
              <div
                style={{
                  width: '48px',
                  background: 'white',
                  borderRight: '1px solid rgba(0,0,0,0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  paddingTop: '16px',
                  gap: '10px',
                  flexShrink: 0,
                }}
              >
                {[
                  { bg: '#0066FF', active: true },
                  { bg: '#e5e7eb', active: false },
                  { bg: '#e5e7eb', active: false },
                  { bg: '#e5e7eb', active: false },
                ].map((item, i) => (
                  <div
                    key={i}
                    style={{
                      width: '28px',
                      height: '6px',
                      borderRadius: '3px',
                      background: item.bg,
                    }}
                  />
                ))}
              </div>

              {/* Main content */}
              <div style={{ flex: 1, padding: '20px' }}>
                {/* Top stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '14px' }}>
                  {stats.map(item => (
                    <div
                      key={item.label}
                      style={{
                        background: 'white',
                        borderRadius: '10px',
                        padding: '12px 14px',
                        border: '1px solid rgba(0,0,0,0.05)',
                      }}
                    >
                      <div style={{ fontSize: '10px', color: '#9e9ea8', marginBottom: '5px', fontWeight: 500 }}>{item.label}</div>
                      <div style={{ fontSize: '17px', fontWeight: 700, color: '#171717', letterSpacing: '-0.02em', marginBottom: '3px' }}>{item.value}</div>
                      <div
                        style={{
                          fontSize: '10px',
                          color: item.color,
                          fontWeight: 600,
                          display: 'inline-flex',
                          alignItems: 'center',
                          background: item.barColor,
                          padding: '1px 6px',
                          borderRadius: '4px',
                        }}
                      >
                        {item.change}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Chart */}
                <div
                  style={{
                    background: 'white',
                    borderRadius: '10px',
                    padding: '14px 16px',
                    border: '1px solid rgba(0,0,0,0.05)',
                    height: '88px',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ fontSize: '10px', color: '#9e9ea8', fontWeight: 500, marginBottom: '8px' }}>Выручка за 12 месяцев</div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '50px' }}>
                    {[30, 52, 38, 65, 48, 72, 58, 80, 55, 88, 70, 100].map((h, i) => (
                      <div
                        key={i}
                        style={{
                          flex: 1,
                          height: `${h}%`,
                          background: i === 11
                            ? 'linear-gradient(180deg, #0066FF, #6366f1)'
                            : `rgba(0,102,255,${0.08 + (h / 100) * 0.18})`,
                          borderRadius: '3px 3px 0 0',
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
