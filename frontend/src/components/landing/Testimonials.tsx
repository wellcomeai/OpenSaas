const items = [
  {
    quote:
      "Запустили MVP за выходные. Не пришлось писать аутентификацию и биллинг с нуля.",
    name: "Анна К.",
    role: "Founder, EdTech стартап",
  },
  {
    quote:
      "Модульная структура и CLAUDE.md делают доработку через AI быстрой и безопасной.",
    name: "Дмитрий С.",
    role: "Solo developer",
  },
  {
    quote: "Реферальная программа подняла conversion в 2 раза.",
    name: "Иван П.",
    role: "Growth, SaaS",
  },
];

export function Testimonials() {
  return (
    <section className="bg-muted/30 py-24">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold">Что говорят пользователи</h2>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {items.map((t) => (
            <div key={t.name} className="rounded-lg border bg-card p-6">
              <p className="text-sm">«{t.quote}»</p>
              <div className="mt-4 text-sm">
                <div className="font-medium">{t.name}</div>
                <div className="text-muted-foreground">{t.role}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
