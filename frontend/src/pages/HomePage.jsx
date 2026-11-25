import { ArrowRight, ClipboardList, FileText, HeartPulse } from 'lucide-react'
import { Link } from 'react-router-dom'

const workflowSteps = [
  {
    icon: FileText,
    title: 'Share discharge details',
    description: 'A place to make important documents available to the patient.',
  },
  {
    icon: ClipboardList,
    title: 'Review a recovery plan',
    description: 'Keep shared next steps together in one clear view.',
  },
  {
    icon: HeartPulse,
    title: 'Stay connected',
    description: 'Use daily check-ins to keep communication moving.',
  },
]

function HomePage() {
  return (
    <div>
      <section className="relative overflow-hidden border-b border-line bg-white">
        <div
          aria-hidden="true"
          className="absolute -right-36 -top-40 size-[30rem] rounded-full bg-teal-light/70 blur-3xl"
        />
        <div className="relative mx-auto grid w-full max-w-7xl items-center gap-12 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:px-12 lg:py-28">
          <div className="max-w-2xl">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-teal/20 bg-teal-light px-4 py-2 text-sm font-semibold text-teal-dark">
              <span aria-hidden="true" className="size-2 rounded-full bg-teal" />
              A connected care experience
            </p>
            <h1 className="text-4xl font-semibold leading-tight tracking-tight text-navy sm:text-5xl lg:text-6xl">
              Welcome to <span className="text-teal">RE:CARE AI</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-muted">
              A thoughtful frontend concept for connecting patients and care teams
              around the recovery journey. This demo uses synthetic information
              and does not provide medical advice.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                className="inline-flex min-h-12 items-center gap-2 rounded-full bg-teal px-5 py-3 font-semibold text-white transition-colors hover:bg-teal-dark focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal"
                to="/patient"
              >
                Patient Portal
                <ArrowRight aria-hidden="true" size={18} />
              </Link>
              <Link
                className="inline-flex min-h-12 items-center gap-2 rounded-full border border-line bg-white px-5 py-3 font-semibold text-navy transition-colors hover:bg-canvas focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal"
                to="/doctor"
              >
                Doctor Dashboard
                <ArrowRight aria-hidden="true" size={18} />
              </Link>
            </div>
          </div>

          <div
            aria-label="Recovery workflow illustration"
            className="relative mx-auto grid aspect-square w-full max-w-sm place-items-center rounded-full border border-teal/15 bg-canvas"
            role="img"
          >
            <div className="absolute inset-[12%] rounded-full border border-teal/20" />
            <div className="absolute inset-[25%] rounded-full bg-teal-light" />
            <div className="relative grid size-32 place-items-center rounded-[2rem] bg-teal text-white shadow-xl shadow-teal/15 sm:size-40">
              <HeartPulse aria-hidden="true" size={68} strokeWidth={1.6} />
            </div>
            <span className="absolute left-[13%] top-[25%] rounded-full bg-white px-3 py-2 text-xs font-semibold text-navy shadow-sm">
              Patient
            </span>
            <span className="absolute bottom-[22%] right-[8%] rounded-full bg-white px-3 py-2 text-xs font-semibold text-navy shadow-sm">
              Care team
            </span>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="workflow-title"
        className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:px-12"
      >
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal">
            How it fits together
          </p>
          <h2
            className="mt-3 text-3xl font-semibold tracking-tight text-navy sm:text-4xl"
            id="workflow-title"
          >
            A clearer recovery workflow.
          </h2>
          <p className="mt-4 leading-7 text-muted">
            A simple concept for keeping shared information and check-ins
            together throughout recovery.
          </p>
        </div>

        <ol className="mt-10 grid gap-5 md:grid-cols-3">
          {workflowSteps.map(({ icon: Icon, title, description }, index) => (
            <li
              className="rounded-2xl border border-line bg-white p-6 sm:p-7"
              key={title}
            >
              <div className="flex items-center justify-between">
                <span className="grid size-12 place-items-center rounded-xl bg-teal-light text-teal-dark">
                  <Icon aria-hidden="true" size={22} />
                </span>
                <span className="text-sm font-bold text-teal" aria-label={`Step ${index + 1}`}>
                  0{index + 1}
                </span>
              </div>
              <h3 className="mt-5 text-lg font-semibold text-navy">{title}</h3>
              <p className="mt-2 leading-7 text-muted">{description}</p>
            </li>
          ))}
        </ol>
        <p className="mt-6 text-sm leading-6 text-muted">
          Demo only: document handling, care plans, and check-ins are not
          connected to a backend.
        </p>
      </section>
    </div>
  )
}

export default HomePage
