"use client";

import { useScrollReveal } from '@/hooks/useScrollReveal';

const items = [
  {
    icon: '🏗️',
    title: 'Форкни и запускай',
    desc: 'Клонируй репозиторий, заполни .env, запусти docker-compose. Первый запуск за 10 минут.',
  },
  {
    icon: '🔧',
    title: 'Доработай под себя',
    desc: 'Модульная архитектура: добавляй новые модули по готовому паттерну. Каждый модуль — изолированный домен.',
  },
  {
    icon: '🚀',
    title: 'Выпускай продукт',
    desc: 'Деплой на Render, VPS или любой Docker-хостинг. CI/CD, миграции и создание админа — автоматически.',
  },
];

export function WhatIsItSection() {
  const sectionRef = useScrollReveal();

  return (
    <section
      ref={sectionRef as React.RefObject<HTMLElement>}
      className="reveal"
      style={{ background: 'white', padding: '120px 0' }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px' }}>
        <div className="grid md:grid-cols-2 gap-16 items-start">
          {/* Left sticky column */}
          <div className="md:sticky md:top-24">
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
              01 / ЧТО ЭТО
            </div>
            <h2
              style={{
                fontSize: 'clamp(2rem, 4vw, 3.5rem)',
                fontWeight: 800,
                letterSpacing: '-0.025em',
                lineHeight: '1.05',
                color: '#171717',
                marginBottom: '24px',
              }}
            >
              Готовая база для любого SaaS-проекта
            </h2>
            <p style={{ fontSize: '16px', color: '#616161', lineHeight: '1.7', marginBottom: '16px' }}>
              OpenSaaS — это open-source шаблон, который можно форкнуть и запустить под себя за считанные часы. Никакого vendor lock-in, никаких скрытых платежей.
            </p>
            <p style={{ fontSize: '16px', color: '#616161', lineHeight: '1.7' }}>
              Вся инфраструктура уже написана: аутентификация, биллинг, реферальная система, API-ключи, админка. Остаётся только добавить бизнес-логику.
            </p>
          </div>

          {/* Right column — cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {items.map((item, i) => (
              <div
                key={item.title}
                className="reveal border border-black/[0.07] rounded-2xl p-6 bg-white transition-all duration-200 hover:border-[#0066FF]/20 hover:shadow-[0_8px_32px_rgba(0,102,255,0.08)]"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div style={{ fontSize: '28px', marginBottom: '12px' }}>{item.icon}</div>
                <div
                  style={{ fontSize: '17px', fontWeight: 700, color: '#171717', marginBottom: '8px', letterSpacing: '-0.01em' }}
                >
                  {item.title}
                </div>
                <p style={{ fontSize: '14px', color: '#616161', lineHeight: '1.6', margin: 0 }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
