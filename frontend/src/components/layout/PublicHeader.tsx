"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

const navLinks = [
  { href: "/#what-you-get", label: "Что внутри" },
  { href: "/#ai-agents", label: "AI" },
  { href: "/#how-to-start", label: "Как начать" },
];

export function PublicHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const baseShadow = scrolled
    ? '0 8px 32px rgba(0,0,0,0.1), 0 0 0 1px rgba(255,255,255,0.5) inset'
    : '0 2px 12px rgba(0,0,0,0.05), 0 0 0 1px rgba(255,255,255,0.5) inset';
  const hoverShadow = '0 14px 40px rgba(0,102,255,0.18), 0 0 0 1px rgba(0,102,255,0.18) inset';

  return (
    <header
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'fixed',
        top: '12px',
        left: '16px',
        right: '16px',
        zIndex: 50,
        height: '52px',
        borderRadius: '14px',
        transition: 'box-shadow 0.3s ease, background 0.3s ease, transform 0.3s ease, border-color 0.3s ease',
        background: hovered ? 'rgba(255,255,255,0.96)' : 'rgba(255,255,255,0.88)',
        backdropFilter: 'blur(24px) saturate(180%)',
        border: hovered ? '1px solid rgba(0,102,255,0.18)' : '1px solid rgba(0,0,0,0.08)',
        boxShadow: hovered ? hoverShadow : baseShadow,
        transform: hovered ? 'translateY(-1px)' : 'translateY(0)',
      }}
    >
      <div
        style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}
        className="flex h-full items-center justify-between"
      >
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2" style={{ textDecoration: 'none' }}>
          <Image
            src="/logo.png"
            alt="OpenSaaS"
            width={26}
            height={26}
            style={{ borderRadius: '7px' }}
            priority
          />
          <span
            style={{
              fontFamily: 'Geist, sans-serif',
              fontWeight: 700,
              fontSize: '15px',
              color: '#171717',
              letterSpacing: '-0.02em',
            }}
          >
            OpenSaaS
          </span>
        </Link>

        {/* Nav */}
        <nav className="hidden md:flex items-center gap-5">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="text-[13px] text-[#616161] no-underline font-normal tracking-tight transition-colors duration-150 hover:text-[#171717]"
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* CTA buttons */}
        <div className="flex items-center gap-1.5">
          <Link href="/login" className="no-underline">
            <button
              type="button"
              className="text-[#616161] text-[13px] font-medium px-3 h-8 rounded-[9px] cursor-pointer transition-colors duration-150 hover:text-[#171717] hover:bg-black/[0.04]"
              style={{ background: 'transparent', border: 'none' }}
            >
              Войти
            </button>
          </Link>
          <Link href="/register" className="no-underline">
            <button
              type="button"
              className="text-white text-[13px] font-semibold px-3.5 h-8 rounded-[9px] cursor-pointer tracking-tight transition-all duration-200 hover:bg-[#0052CC] hover:shadow-[0_4px_14px_rgba(0,102,255,0.4)]"
              style={{
                background: '#0066FF',
                border: 'none',
                boxShadow: '0 2px 8px rgba(0,102,255,0.3)',
              }}
            >
              Регистрация
            </button>
          </Link>
        </div>
      </div>
    </header>
  );
}
