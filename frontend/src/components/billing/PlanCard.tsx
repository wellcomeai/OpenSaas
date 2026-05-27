"use client";

import { Check } from "lucide-react";
import { formatMoney } from "@/lib/utils";
import type { Plan } from "@/types";

interface Props {
  plan: Plan;
  active?: boolean;
  loading?: boolean;
  onSubscribe?: (plan: Plan) => void;
}

export function PlanCard({ plan, active, loading, onSubscribe }: Props) {
  return (
    <div
      style={{
        background: active
          ? 'linear-gradient(145deg, #0052d4 0%, #4364f7 100%)'
          : 'white',
        border: active ? 'none' : '1px solid rgba(0,0,0,0.07)',
        borderRadius: '20px',
        padding: '28px',
        boxShadow: active
          ? '0 16px 48px rgba(0,102,255,0.25)'
          : '0 2px 12px rgba(0,0,0,0.04)',
        transition: 'all 0.3s ease',
      }}
      className={active ? 'plan-card-active' : 'plan-card'}
    >
      <div
        style={{
          fontSize: '12px',
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: active ? 'rgba(255,255,255,0.65)' : '#8e8e93',
          marginBottom: '8px',
        }}
      >
        {plan.name}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <span
          style={{
            fontSize: '36px',
            fontWeight: 800,
            color: active ? 'white' : '#171717',
            letterSpacing: '-0.03em',
            lineHeight: 1,
          }}
        >
          {formatMoney(plan.price, plan.currency)}
        </span>
        <span
          style={{
            fontSize: '14px',
            color: active ? 'rgba(255,255,255,0.55)' : '#8e8e93',
            marginLeft: '6px',
          }}
        >
          / {plan.interval === "month" ? "мес" : "год"}
        </span>
      </div>

      <div
        style={{
          height: '1px',
          background: active ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.06)',
          marginBottom: '16px',
        }}
      />

      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px' }}>
        {plan.features.map((f) => (
          <li
            key={f}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '5px 0',
              fontSize: '14px',
              color: active ? 'rgba(255,255,255,0.88)' : '#3a3a3e',
            }}
          >
            <span
              style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                background: active ? 'rgba(255,255,255,0.2)' : 'rgba(0,102,255,0.1)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Check size={10} color={active ? 'white' : '#0066FF'} strokeWidth={3} />
            </span>
            {f}
          </li>
        ))}
      </ul>

      <button
        type="button"
        disabled={loading || active}
        onClick={() => onSubscribe?.(plan)}
        style={{
          width: '100%',
          height: '44px',
          borderRadius: '12px',
          border: 'none',
          background: active ? 'white' : '#0066FF',
          color: active ? '#0052d4' : 'white',
          fontSize: '14px',
          fontWeight: 600,
          cursor: active || loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.7 : 1,
          letterSpacing: '-0.01em',
          boxShadow: active ? '0 4px 14px rgba(0,0,0,0.12)' : '0 4px 14px rgba(0,102,255,0.25)',
          transition: 'all 0.2s ease',
        }}
      >
        {active ? "Текущий план" : loading ? "Подождите..." : "Выбрать"}
      </button>

      <style jsx>{`
        .plan-card:hover {
          border-color: rgba(0, 102, 255, 0.2) !important;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08) !important;
          transform: translateY(-2px);
        }
      `}</style>
    </div>
  );
}
