const techs = [
  'FastAPI',
  'SQLAlchemy',
  'Next.js 14',
  'PostgreSQL',
  'Redis',
  'JWT',
  'Alembic',
  'Docker',
  'TypeScript',
  'Tailwind CSS',
];

export function LogoStrip() {
  const items = [...techs, ...techs];

  return (
    <div
      style={{
        background: '#f5f5f7',
        padding: '24px 0',
        overflow: 'hidden',
        borderTop: '1px solid rgba(0,0,0,0.05)',
        borderBottom: '1px solid rgba(0,0,0,0.05)',
      }}
    >
      <div style={{ marginBottom: '10px', textAlign: 'center' }}>
        <span
          style={{
            fontSize: '11px',
            color: '#b0b0b8',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            fontWeight: 600,
          }}
        >
          Построен на проверенных технологиях
        </span>
      </div>

      {/* Fade masks */}
      <div
        style={{
          position: 'relative',
          overflow: 'hidden',
          maskImage: 'linear-gradient(to right, transparent, black 12%, black 88%, transparent)',
          WebkitMaskImage: 'linear-gradient(to right, transparent, black 12%, black 88%, transparent)',
        }}
      >
        <div
          className="animate-marquee"
          style={{
            display: 'flex',
            width: 'max-content',
          }}
        >
          {items.map((tech, i) => (
            <span
              key={i}
              style={{
                fontSize: '13px',
                fontWeight: 500,
                color: '#9e9ea8',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                padding: '0 28px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '28px',
                whiteSpace: 'nowrap',
              }}
            >
              {tech}
              <span style={{ color: '#d1d1d6', fontSize: '16px', lineHeight: 1 }}>·</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
