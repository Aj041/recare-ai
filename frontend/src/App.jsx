import { ArrowDown, HeartPulse, ShieldCheck, Sparkles } from 'lucide-react'

const highlights = [
  {
    icon: HeartPulse,
    title: 'People come first',
    description: 'A thoughtful experience shaped around the people in every care journey.',
  },
  {
    icon: ShieldCheck,
    title: 'Trust by design',
    description: 'Clear, considerate interactions that put privacy and understanding first.',
  },
  {
    icon: Sparkles,
    title: 'Technology with purpose',
    description: 'A welcoming foundation for more connected care experiences.',
  },
]

function App() {
  return (
    <main className="min-h-screen overflow-hidden bg-canvas text-navy">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6 sm:px-10 lg:px-12">
        <a
          aria-label="RE:CARE AI home"
          className="flex items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal"
          href="#home"
        >
          <span className="grid size-10 place-items-center rounded-xl bg-teal text-white">
            <HeartPulse aria-hidden="true" size={22} strokeWidth={2.2} />
          </span>
          <span className="text-lg font-bold tracking-tight">
            RE:<span className="text-teal">CARE</span>
            <span className="ml-1 text-xs font-semibold tracking-[0.16em] text-muted">AI</span>
          </span>
        </a>
        <a
          className="rounded-full px-4 py-2 text-sm font-semibold text-navy transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
          href="#approach"
        >
          Our approach
        </a>
      </header>

      <section
        aria-labelledby="welcome-title"
        className="relative mx-auto grid min-h-[620px] w-full max-w-7xl items-center gap-14 px-6 py-16 sm:px-10 lg:min-h-[680px] lg:grid-cols-[1.05fr_0.95fr] lg:px-12 lg:py-24"
        id="home"
      >
        <div className="relative z-10 max-w-2xl">
          <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-teal/20 bg-teal-light px-4 py-2 text-sm font-semibold text-teal-dark">
            <span aria-hidden="true" className="size-2 rounded-full bg-teal" />
            A more connected care experience
          </p>
          <h1
            className="max-w-xl text-5xl font-semibold leading-[1.08] tracking-[-0.045em] text-navy sm:text-6xl lg:text-7xl"
            id="welcome-title"
          >
            Care that feels <span className="text-teal">more human.</span>
          </h1>
          <p className="mt-7 max-w-lg text-lg leading-8 text-muted sm:text-xl">
            Welcome to RE:CARE AI — a thoughtful new way to bring people and care
            experiences closer together.
          </p>
          <a
            className="mt-9 inline-flex min-h-12 items-center gap-3 rounded-full bg-teal px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-teal-dark focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal"
            href="#approach"
          >
            Get to know us
            <ArrowDown aria-hidden="true" size={18} />
          </a>
          <p className="mt-5 text-sm text-muted">
            Built around people. Designed for better connection.
          </p>
        </div>

        <div aria-hidden="true" className="relative mx-auto flex aspect-square w-full max-w-md items-center justify-center">
          <div className="absolute inset-[8%] rounded-full border border-teal/15" />
          <div className="absolute inset-[19%] rounded-full border border-teal/20" />
          <div className="absolute inset-[30%] rounded-full bg-teal-light" />
          <div className="relative grid size-40 place-items-center rounded-[2.5rem] bg-white shadow-[0_24px_80px_-28px_rgba(21,52,73,0.28)] sm:size-48">
            <div className="grid size-24 place-items-center rounded-[1.75rem] bg-teal text-white sm:size-28">
              <HeartPulse size={58} strokeWidth={1.6} />
            </div>
          </div>
          <span className="absolute right-[8%] top-[20%] size-4 rounded-full bg-teal/30" />
          <span className="absolute bottom-[18%] left-[12%] size-3 rounded-full bg-navy/20" />
          <span className="absolute bottom-[12%] right-[22%] size-2 rounded-full bg-teal" />
        </div>
      </section>

      <section
        aria-labelledby="approach-title"
        className="border-t border-line bg-white/70"
        id="approach"
      >
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10 lg:px-12 lg:py-24">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-teal">
              The RE:CARE approach
            </p>
            <h2
              className="mt-4 text-3xl font-semibold tracking-tight text-navy sm:text-4xl"
              id="approach-title"
            >
              A foundation built on care.
            </h2>
            <p className="mt-4 text-lg leading-8 text-muted">
              We believe the best care experiences start with listening,
              thoughtful design, and technology that serves people.
            </p>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {highlights.map(({ icon: Icon, title, description }) => (
              <article
                className="rounded-2xl border border-line bg-white p-7"
                key={title}
              >
                <span className="grid size-12 place-items-center rounded-xl bg-teal-light text-teal-dark">
                  <Icon aria-hidden="true" size={23} strokeWidth={1.9} />
                </span>
                <h3 className="mt-5 text-lg font-semibold text-navy">{title}</h3>
                <p className="mt-2 leading-7 text-muted">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-6 py-7 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-10 lg:px-12">
        <span className="font-semibold text-navy">RE:CARE AI</span>
        <span>A care experience concept, designed around people.</span>
      </footer>
    </main>
  )
}

export default App
