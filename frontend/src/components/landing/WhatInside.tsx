"use client";

import { Shield, CreditCard, LayoutDashboard, Gift } from "lucide-react";
import { motion } from "framer-motion";

const cards = [
  {
    Icon: Shield,
    color: "#0066FF",
    bg: "rgba(0,102,255,0.08)",
    title: "Регистрация пользователей",
    text: "Вход, выход, восстановление пароля и подтверждение email — работает из коробки",
  },
  {
    Icon: CreditCard,
    color: "#10b981",
    bg: "rgba(16,185,129,0.08)",
    title: "Приём платежей",
    text: "Подключи оплату за 5 минут — просто вставь ключи. История транзакций в админке",
  },
  {
    Icon: LayoutDashboard,
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.08)",
    title: "Личный кабинет",
    text: "Каждый пользователь видит свои данные, подписку и историю платежей",
  },
  {
    Icon: Gift,
    color: "#8b5cf6",
    bg: "rgba(139,92,246,0.1)",
    title: "Партнёрская программа",
    text: "Пользователи приглашают друзей — платформа растёт сама",
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

export function WhatInside() {
  return (
    <section style={{ position: "relative", overflow: "hidden", background: "#ffffff", padding: "120px 0" }}>
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: "-100px",
          left: "-120px",
          width: "380px",
          height: "380px",
          borderRadius: "50%",
          background: "rgba(16,185,129,0.05)",
          filter: "blur(60px)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          bottom: "-120px",
          right: "-140px",
          width: "420px",
          height: "420px",
          borderRadius: "50%",
          background: "rgba(0,102,255,0.05)",
          filter: "blur(65px)",
          pointerEvents: "none",
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
            03 / ВОЗМОЖНОСТИ
          </div>
          <h2
            style={{
              fontSize: "clamp(2rem, 4vw, 3.5rem)",
              fontWeight: 800,
              letterSpacing: "-0.025em",
              lineHeight: "1.05",
              color: "#171717",
              marginBottom: "16px",
            }}
          >
            Всё уже написано за вас
          </h2>
          <p
            style={{
              fontSize: "18px",
              color: "#616161",
              lineHeight: "1.6",
              maxWidth: "600px",
              margin: "0 auto",
            }}
          >
            Не тратьте месяцы на инфраструктуру — сосредоточьтесь на своей идее
          </p>
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
