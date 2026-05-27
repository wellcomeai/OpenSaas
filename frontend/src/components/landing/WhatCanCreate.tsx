"use client";

import { motion } from "framer-motion";
import { Repeat, ShoppingBag, Wrench, GraduationCap } from "lucide-react";

const cards = [
  {
    Icon: Repeat,
    color: "#0066FF",
    bg: "rgba(0,102,255,0.08)",
    title: "Сервис подписок",
    text: "Продавай доступ к контенту или инструменту по подписке",
  },
  {
    Icon: ShoppingBag,
    color: "#10b981",
    bg: "rgba(16,185,129,0.08)",
    title: "Маркетплейс",
    text: "Площадка где продавцы и покупатели находят друг друга",
  },
  {
    Icon: Wrench,
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.08)",
    title: "SaaS-инструмент",
    text: "Онлайн-сервис который решает конкретную задачу бизнеса",
  },
  {
    Icon: GraduationCap,
    color: "#8b5cf6",
    bg: "rgba(139,92,246,0.1)",
    title: "Образовательная платформа",
    text: "Курсы, уроки, закрытый клуб с подпиской",
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

export function WhatCanCreate() {
  return (
    <section
      style={{
        position: 'relative',
        overflow: 'hidden',
        background:
          'linear-gradient(180deg, #ffffff 0%, #f5f5f7 12%, #f5f5f7 88%, #ffffff 100%)',
        padding: '120px 0',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '-350px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'rgba(0,102,255,0.06)',
          filter: 'blur(90px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <div style={{ position: "relative", zIndex: 1, maxWidth: "1100px", margin: "0 auto", padding: "0 24px" }}>
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
            02 / ЧТО МОЖНО СОЗДАТЬ
          </div>
          <h2
            style={{
              fontSize: "clamp(2rem, 4vw, 3.5rem)",
              fontWeight: 800,
              letterSpacing: "-0.025em",
              lineHeight: "1.05",
              color: "#171717",
            }}
          >
            Какую платформу ты запустишь?
          </h2>
        </div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 gap-5"
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
      </div>
    </section>
  );
}
