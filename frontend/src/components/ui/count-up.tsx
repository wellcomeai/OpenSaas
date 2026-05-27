"use client";

import { useEffect, useRef, useState } from 'react';
import { useInView } from '@/hooks/useInView';

interface CountUpProps {
  end: number;
  duration?: number;
  suffix?: string;
  prefix?: string;
}

export function CountUp({ end, duration = 1500, suffix = '', prefix = '' }: CountUpProps) {
  const [count, setCount] = useState(0);
  const [ref, isInView] = useInView();
  const started = useRef(false);

  useEffect(() => {
    if (!isInView || started.current) return;
    started.current = true;
    const startTime = performance.now();
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * end));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [isInView, end, duration]);

  return (
    <span ref={ref as React.RefObject<HTMLSpanElement>}>
      {prefix}{count}{suffix}
    </span>
  );
}
