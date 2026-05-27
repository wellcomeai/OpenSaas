"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { UserPlus, LayoutDashboard, Sparkles } from "lucide-react";

const cards = [
  {
    Icon: UserPlus,
    color: "#0066FF",
    bg: "rgba(0,102,255,0.08)",
    title: "Зарегистрируйся",
    text: "Та же форма что получишь ты",
  },
  {
    Icon: LayoutDashboard,
    color: "#10b981",
    bg: "rgba(16,185,129,0.08)",
    title: "Загляни в кабинет",
    text: "Подписки, рефералы, настройки",
  },
  {
    Icon: Sparkles,
    color: "#8b5cf6",
    bg: "rgba(139,92,246,0.1)",
    title: "Исследуй сам",
    text: "Всё что видишь — твоё после покупки",
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
};

export function LiveDemo() {
  return (
    <section
      style={{
        position: "relative",
        overflow: "hidden",
        background:
          "radial-gradient(ellipse 70% 50% at 15% 50%, rgba(0,102,255,0.06) 0%, transparent 60%), radial-gradient(ellipse 50% 40% at 85% 30%, rgba(139,92,246,0.05) 0%, transparent 60%), #ffffff",
        padding: "120px 0",
      }}
    >
      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: "1100px",
          margin: "0 auto",
          padding: "0 24px",
        }}
      >
        <div className="text-center" style={{ marginBottom: "64px" }}>
          <div
            style={{
              fontSize: "12px",
              color: "#0066FF",
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: "16px",
            }}
          >
            ЖИВОЕ ДЕМО
          </div>
          <h2
            style={{
              fontSize: "clamp(2rem, 4vw, 3.5rem)",
              fontWeight: 800,
              letterSpacing: "-0.025em",
              lineHeight: "1.05",
              color: "#171717",
              marginBottom: "20px",
            }}
          >
            «Этот сайт — и есть шаблон»
          </h2>
          <p
            style={{
              fontSize: "18px",
              color: "#616161",
              lineHeight: "1.6",
              maxWidth: "640px",
              margin: "0 auto",
            }}
          >
            То что вы видите прямо сейчас — не презентация и не макет. Это реально работающая
            платформа, собранная на том самом шаблоне. После покупки у вас будет один в один
            такая же — со своим брендом, своими пользователями и своими подписками.
          </p>
        </div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-5"
          style={{ marginBottom: "48px" }}
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          {cards.map((card) => (
            <motion.div
              key={card.title}
              variants={itemVariants}
              className="bento-card"
              style={{ padding: "32px" }}
            >
              <div
                style={{
                  width: "52px",
                  height: "52px",
                  borderRadius: "14px",
                  background: card.bg,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "20px",
                }}
              >
                <card.Icon size={24} color={card.color} strokeWidth={1.75} />
              </div>
              <h3
                style={{
                  fontSize: "20px",
                  fontWeight: 700,
                  color: "#171717",
                  letterSpacing: "-0.015em",
                  marginBottom: "8px",
                }}
              >
                {card.title}
              </h3>
              <p
                style={{
                  fontSize: "15px",
                  color: "#616161",
                  lineHeight: "1.6",
                  margin: 0,
                }}
              >
                {card.text}
              </p>
            </motion.div>
          ))}
        </motion.div>

        <div style={{ textAlign: "center" }}>
          <Link href="#what-you-get" className="btn-secondary-new live-demo-cta">
            Узнать подробнее
          </Link>
        </div>
      </div>

      <style jsx>{`
        :global(.live-demo-cta) {
          transition: transform 200ms ease, box-shadow 200ms ease,
            border-color 200ms ease, background 200ms ease;
        }
        :global(.live-demo-cta:hover) {
          transform: translateY(-1px);
          border-color: #0066ff;
          box-shadow: 0 8px 24px rgba(0, 102, 255, 0.18),
            0 2px 6px rgba(0, 0, 0, 0.06);
        }
      `}</style>
    </section>
  );
}
