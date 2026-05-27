import Link from "next/link";
import Image from "next/image";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen mesh-bg flex flex-col noise overflow-hidden">
      {/* Header */}
      <header style={{ padding: '20px 28px' }}>
        <Link
          href="/"
          className="inline-flex items-center gap-2"
          style={{ textDecoration: 'none' }}
        >
          <Image
            src="/logo.png"
            alt="OpenSaaS"
            width={26}
            height={26}
            style={{ borderRadius: '7px' }}
          />
          <span
            style={{
              fontWeight: 700,
              fontSize: '15px',
              color: '#171717',
              letterSpacing: '-0.02em',
              fontFamily: 'Geist, sans-serif',
            }}
          >
            OpenSaaS
          </span>
        </Link>
      </header>

      {/* Content */}
      <main className="flex flex-1 items-center justify-center py-12 px-4">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
