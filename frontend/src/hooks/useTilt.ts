import { useRef, useCallback } from 'react';

export function useTilt(intensity = 3) {
  const ref = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `perspective(1000px) rotateY(${x * intensity}deg) rotateX(${-y * intensity}deg) translateZ(8px)`;
  }, [intensity]);

  const handleMouseLeave = useCallback(() => {
    if (ref.current) {
      ref.current.style.transform = 'perspective(1000px) rotateY(0deg) rotateX(0deg) translateZ(0px)';
      ref.current.style.transition = 'transform 0.4s ease';
    }
  }, []);

  const handleMouseEnter = useCallback(() => {
    if (ref.current) {
      ref.current.style.transition = 'transform 0.1s ease';
    }
  }, []);

  return { ref, handleMouseMove, handleMouseLeave, handleMouseEnter };
}
