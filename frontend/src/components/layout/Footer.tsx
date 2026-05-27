"use client";

import Link from "next/link";
import Image from "next/image";

const columns = [
  {
    title: 'Продукт',
    links: [
      { label: 'Что внутри', href: '/#what-you-get' },
      { label: 'AI', href: '/#ai-agents' },
      { label: 'Как начать', href: '/#how-to-start' },
    ],
  },
  {
    title: 'Аккаунт',
    links: [
      { label: 'Войти', href: '/login' },
      { label: 'Регистрация', href: '/register' },
    ],
  },
  {
    title: 'Контакты',
    links: [
      { label: 'Автор шаблона', href: 'https://t.me/wellcome_ai' },
    ],
  },
];

export function Footer() {
  return (
    <footer
      style={{
        background: 'linear-gradient(180deg, #0a3fa8 0%, #072f82 60%, #051f5e 100%)',
        color: 'white',
        padding: '64px 0 32px',
        marginTop: '-1px',
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px' }}>
        {/* Top section */}
        <div className="grid md:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div>
            <Link
              href="/"
              className="flex items-center gap-1.5 mb-3"
              style={{ textDecoration: 'none' }}
            >
              <Image src="/logo.png" alt="logo" width={28} height={28} style={{ borderRadius: '6px' }} />
              <span
                style={{
                  fontWeight: 600,
                  fontSize: '17px',
                  color: 'white',
                  letterSpacing: '-0.01em',
                }}
              >
                OpenSaaS
              </span>
            </Link>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.65)', lineHeight: '1.6' }}>
              Готовая платформа для запуска онлайн-сервиса. Шаблон + 5 видеоуроков.
            </p>
          </div>

          {/* Columns */}
          {columns.map(col => (
            <div key={col.title}>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'white',
                  marginBottom: '12px',
                  letterSpacing: '-0.01em',
                }}
              >
                {col.title}
              </div>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {col.links.map(link => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-white/65 no-underline transition-colors duration-150 hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div
          style={{
            borderTop: '1px solid rgba(255,255,255,0.12)',
            paddingTop: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)' }}>
            © {new Date().getFullYear()} OpenSaaS. Все права защищены.
          </span>
        </div>
      </div>
    </footer>
  );
}
