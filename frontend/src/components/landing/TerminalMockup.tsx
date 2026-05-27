"use client";

import { useEffect, useRef, useState } from 'react';
import { useInView } from '@/hooks/useInView';

interface TerminalLine {
  type: 'input' | 'process' | 'success';
  text: string;
  delay: number;
}

const lines: TerminalLine[] = [
  { type: 'input',   text: '> Добавь модуль Projects в OpenSaaS', delay: 0 },
  { type: 'process', text: '✓ Читаю CLAUDE.md...', delay: 600 },
  { type: 'process', text: '✓ Создаю backend/modules/projects/', delay: 1000 },
  { type: 'process', text: '✓ Генерирую модель, схему, сервис...', delay: 1400 },
  { type: 'process', text: '✓ Добавляю миграцию Alembic...', delay: 1800 },
  { type: 'process', text: '✓ Подключаю роутер в router.py...', delay: 2200 },
  { type: 'process', text: '✓ Создаю страницу в frontend...', delay: 2600 },
  { type: 'success', text: 'Done in 12 seconds ✨', delay: 3200 },
];

export function TerminalMockup() {
  const [visibleLines, setVisibleLines] = useState<number[]>([]);
  const [ref, isInView] = useInView();
  const started = useRef(false);

  useEffect(() => {
    if (!isInView || started.current) return;
    started.current = true;
    lines.forEach((line, i) => {
      setTimeout(() => {
        setVisibleLines(prev => [...prev, i]);
      }, line.delay);
    });
  }, [isInView]);

  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      className="rounded-2xl overflow-hidden"
      style={{
        background: '#0a0a0a',
        boxShadow: '0 24px 60px rgba(0,0,0,0.15)',
      }}
    >
      {/* Terminal header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
        <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
        <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
        <div className="w-3 h-3 rounded-full bg-[#28c840]" />
        <span className="ml-2 text-xs text-white/40 font-mono">claude code</span>
      </div>

      {/* Terminal body */}
      <div className="p-6 min-h-[280px]">
        <div className="space-y-2 font-mono text-sm">
          {lines.map((line, i) =>
            visibleLines.includes(i) ? (
              <div
                key={i}
                className="flex items-start gap-2 animate-fade-in"
              >
                <span
                  style={{ color: line.type === 'success' ? '#34d399' : line.type === 'process' ? '#34d399' : '#e5e5e5' }}
                  className={line.type === 'success' ? 'font-semibold' : ''}
                >
                  {line.text}
                </span>
              </div>
            ) : null
          )}
          {visibleLines.length < lines.length && (
            <span
              className="inline-block w-2 h-4 bg-white/70 animate-blink"
              style={{ verticalAlign: 'text-bottom' }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
