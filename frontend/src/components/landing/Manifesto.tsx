"use client";

import Link from "next/link";
import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

export function ManifestoSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const orbY = useTransform(scrollYProgress, [0, 1], [120, -160]);

  return (
    <section
      ref={sectionRef}
      style={{
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(180deg, #ffffff 0%, #e8f0ff 35%, #c7d9ff 75%, #b3ccff 100%)',
        padding: '160px 0 200px',
      }}
    >
      {/* Parallax orb */}
      <motion.div
        aria-hidden
        style={{
          position: 'absolute',
          top: '20%',
          left: '50%',
          width: '720px',
          height: '720px',
          marginLeft: '-360px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,102,255,0.18) 0%, rgba(99,102,241,0.08) 40%, transparent 70%)',
          filter: 'blur(80px)',
          pointerEvents: 'none',
          y: orbY,
          zIndex: 0,
        }}
      />

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          maxWidth: '760px',
          margin: '0 auto',
          padding: '0 24px',
          textAlign: 'center',
        }}
      >
        {/* Label */}
        <div
          style={{
            fontSize: '12px',
            color: '#0066FF',
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginBottom: '40px',
          }}
        >
          Манифест
        </div>

        {/* Quote */}
        <blockquote
          style={{
            fontSize: 'clamp(2.5rem, 5vw, 4.5rem)',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            lineHeight: '1.05',
            color: '#0a1f4c',
            margin: '0 0 32px',
          }}
        >
          «Каждый, у кого есть идея,
          <br />
          заслуживает её запустить.»
        </blockquote>

        {/* Description */}
        <p
          style={{
            fontSize: '18px',
            color: '#3a4a6b',
            lineHeight: '1.7',
            maxWidth: '600px',
            margin: '0 auto 56px',
          }}
        >
          OpenSaaS — готовая платформа с продуманной архитектурой. Купи один раз, запускай своё.
        </p>

        <Link href="#" className="btn-primary-new">
          Купить за 3000₽
        </Link>
      </div>
    </section>
  );
}
