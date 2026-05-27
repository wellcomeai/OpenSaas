"use client";

import Link from "next/link";
import { Box, PlayCircle } from "lucide-react";
import { motion } from "framer-motion";

const templateItems = [
  "Регистрация и личный кабинет",
  "Приём оплаты от клиентов",
  "Партнёрская программа",
  "Управление пользователями",
  "Готов к деплою за 1 день",
];

const lessons = [
  { n: "01", title: "Разворачиваем проект локально" },
  { n: "02", title: "Деплой на сервер за 30 минут" },
  { n: "03", title: "Подключаем приём оплаты" },
  { n: "04", title: "Настраиваем под свой бренд" },
  { n: "05", title: "Дорабатываем с помощью AI" },
];

export function WhatYouGet() {
  return (
    <section
      id="what-you-get"
      style={{
        position: "relative",
        overflow: "hidden",
        background: "#ffffff",
        padding: "120px 0",
        marginTop: "-1px",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: "-100px",
          right: "-120px",
          width: "400px",
          height: "400px",
          borderRadius: "50%",
          background: "rgba(0,102,255,0.05)",
          filter: "blur(60px)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          bottom: "-220px",
          left: "-180px",
          width: "320px",
          height: "320px",
          borderRadius: "50%",
          background: "rgba(139,92,246,0.04)",
          filter: "blur(70px)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      <div style={{ position: "relative", zIndex: 1, maxWidth: "1100px", margin: "0 auto", padding: "0 24px" }}>
        {/* Header */}
        <div className="text-center" style={{ marginBottom: "56px" }}>
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
            01 / ЧТО ВЫ ПОЛУЧАЕТЕ
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
            Шаблон + уроки — всё для старта
          </h2>
        </div>

        {/* Two cards */}
        <div
          className="grid grid-cols-1 md:grid-cols-2 gap-5"
          style={{ marginBottom: "48px" }}
        >
          {/* Left card - Template */}
          <motion.div
            className="bento-card"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            style={{ padding: "36px" }}
          >
            <div
              style={{
                width: "52px",
                height: "52px",
                borderRadius: "14px",
                background: "rgba(0,102,255,0.08)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "20px",
              }}
            >
              <Box size={24} color="#0066FF" strokeWidth={1.75} />
            </div>
            <h3
              style={{
                fontSize: "22px",
                fontWeight: 700,
                color: "#171717",
                letterSpacing: "-0.015em",
                marginBottom: "20px",
              }}
            >
              Готовый шаблон
            </h3>
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              {templateItems.map((item) => (
                <li
                  key={item}
                  style={{
                    fontSize: "15px",
                    color: "#3a3a3a",
                    lineHeight: "1.5",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "10px",
                  }}
                >
                  <span style={{ color: "#0066FF", fontWeight: 700 }}>✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Right card - Lessons */}
          <motion.div
            className="bento-card"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            style={{ padding: "36px" }}
          >
            <div
              style={{
                width: "52px",
                height: "52px",
                borderRadius: "14px",
                background: "rgba(139,92,246,0.1)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "20px",
              }}
            >
              <PlayCircle size={24} color="#8b5cf6" strokeWidth={1.75} />
            </div>
            <h3
              style={{
                fontSize: "22px",
                fontWeight: 700,
                color: "#171717",
                letterSpacing: "-0.015em",
                marginBottom: "20px",
              }}
            >
              5 видеоуроков
            </h3>
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              {lessons.map((l) => (
                <li
                  key={l.n}
                  style={{
                    fontSize: "15px",
                    color: "#3a3a3a",
                    lineHeight: "1.5",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "12px",
                  }}
                >
                  <span
                    style={{
                      color: "#8b5cf6",
                      fontWeight: 700,
                      fontFamily: "Geist Mono, monospace",
                      fontSize: "13px",
                      minWidth: "22px",
                    }}
                  >
                    {l.n}
                  </span>
                  <span>{l.title}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>

        {/* Price + CTA */}
        <div
          className="flex flex-wrap items-center justify-center gap-6"
          style={{ textAlign: "center" }}
        >
          <div
            style={{
              fontSize: "32px",
              fontWeight: 800,
              color: "#171717",
              letterSpacing: "-0.02em",
            }}
          >
            Цена: 3000 ₽
          </div>
          <Link href="#" className="btn-primary-new">
            Купить сейчас →
          </Link>
        </div>
      </div>
    </section>
  );
}
