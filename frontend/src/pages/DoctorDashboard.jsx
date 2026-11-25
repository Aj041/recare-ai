import {
  Activity,
  AlertCircle,
  CalendarCheck2,
  CircleUserRound,
  ClipboardList,
  Clock3,
  FileText,
} from 'lucide-react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import PageHeader from '../components/PageHeader.jsx'
import { mockData } from '../data/mockData.js'

function DoctorDashboard() {
  const { doctorDashboard } = mockData

  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8 sm:py-12 lg:px-12">
      <PageHeader
        description="A high-level view of sample patient activity and shared workflow items."
        eyebrow="RE:CARE AI - Doctor Dashboard"
        title="Care team overview"
      >
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-teal-light px-3 py-2 text-xs font-semibold text-teal-dark">
          <span aria-hidden="true" className="size-2 rounded-full bg-teal" />
          Synthetic demo data
        </span>
      </PageHeader>

      <div className="mt-7 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section
          aria-labelledby="patient-list-title"
          className="rounded-2xl border border-line bg-white p-6 sm:p-7"
        >
          <div className="mb-5 flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl bg-teal-light text-teal-dark">
              <CircleUserRound aria-hidden="true" size={21} />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                Care team workspace
              </p>
              <h2 className="mt-1 text-lg font-semibold text-navy" id="patient-list-title">
                Patient list
              </h2>
            </div>
          </div>
          <ul className="divide-y divide-line">
            {doctorDashboard.patients.map((patient) => (
              <li
                className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-1 last:pb-1"
                key={patient.id}
              >
                <div>
                  <p className="font-semibold text-navy">{patient.displayName}</p>
                  <p className="mt-1 text-sm text-muted">{patient.id}</p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-sm font-medium text-navy">{patient.activity}</p>
                  <p className="mt-1 text-xs text-muted">{patient.updatedAt}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-5 text-xs leading-5 text-muted">
            All listed profiles and activity are synthetic.
          </p>
        </section>

        <section
          aria-labelledby="recovery-overview-title"
          className="rounded-2xl border border-line bg-white p-6 sm:p-7"
        >
          <div className="mb-5 flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl bg-teal-light text-teal-dark">
              <ClipboardList aria-hidden="true" size={21} />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                Selected sample profile
              </p>
              <h2 className="mt-1 text-lg font-semibold text-navy" id="recovery-overview-title">
                Recovery overview
              </h2>
            </div>
          </div>
          <dl className="grid gap-3 sm:grid-cols-3">
            {doctorDashboard.overview.map(({ label, value }) => (
              <div className="rounded-xl bg-canvas p-4" key={label}>
                <dt className="text-sm leading-5 text-muted">{label}</dt>
                <dd className="mt-3 text-xl font-semibold tracking-tight text-navy">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-5 text-sm leading-6 text-muted">
            Overview values summarize the sample activity shown in this demo and
            are not clinical assessments.
          </p>
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section
          aria-labelledby="latest-checkin-title"
          className="rounded-2xl border border-line bg-white p-6 sm:p-7"
        >
          <div className="flex items-start gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-teal-light text-teal-dark">
              <CalendarCheck2 aria-hidden="true" size={21} />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                Latest check-in
              </p>
              <h2 className="mt-1 text-lg font-semibold text-navy" id="latest-checkin-title">
                {doctorDashboard.latestCheckIn.patient}
              </h2>
            </div>
          </div>
          <div className="mt-5 rounded-xl border border-line bg-canvas p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-teal-dark">
                <Activity aria-hidden="true" size={17} />
                Sample check-in received
              </span>
              <span className="inline-flex items-center gap-1.5 text-sm text-muted">
                <Clock3 aria-hidden="true" size={15} />
                {doctorDashboard.latestCheckIn.recordedAt}
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted">
              {doctorDashboard.latestCheckIn.description}
            </p>
          </div>
        </section>

        <section
          aria-labelledby="patient-summary-title"
          className="rounded-2xl border border-line bg-white p-6 sm:p-7"
        >
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl bg-teal-light text-teal-dark">
              <FileText aria-hidden="true" size={21} />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                Sample profile
              </p>
              <h2 className="mt-1 text-lg font-semibold text-navy" id="patient-summary-title">
                Patient summary
              </h2>
            </div>
          </div>
          <p className="mt-5 rounded-xl bg-canvas p-5 leading-7 text-muted">
            {doctorDashboard.patientSummary}
          </p>
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section
          aria-labelledby="trend-title"
          className="rounded-2xl border border-line bg-white p-6 sm:p-7"
        >
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl bg-teal-light text-teal-dark">
              <Activity aria-hidden="true" size={21} />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                Sample engagement
              </p>
              <h2 className="mt-1 text-lg font-semibold text-navy" id="trend-title">
                Recovery trend
              </h2>
            </div>
          </div>
          <figure className="mt-5">
            <figcaption className="mb-3 text-sm text-muted">
              Daily check-in activity - synthetic demo data
            </figcaption>
            <div className="h-64 w-full" role="img" aria-label="Line chart showing daily check-in activity over one sample week">
              <ResponsiveContainer height="100%" width="100%">
                <LineChart
                  accessibilityLayer
                  data={doctorDashboard.checkInTrend}
                  margin={{ top: 8, right: 12, bottom: 4, left: -18 }}
                >
                  <CartesianGrid stroke="#dce5e2" strokeDasharray="4 4" />
                  <XAxis
                    axisLine={false}
                    dataKey="day"
                    tick={{ fill: '#526571', fontSize: 12 }}
                    tickLine={false}
                  />
                  <YAxis
                    axisLine={false}
                    domain={[0, 1]}
                    ticks={[0, 1]}
                    tick={{ fill: '#526571', fontSize: 12 }}
                    tickFormatter={(value) => (value === 1 ? 'Logged' : 'None')}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value) => [value === 1 ? 'Logged' : 'None', 'Check-in']}
                    labelFormatter={(label) => `${label} (sample)`}
                  />
                  <Line
                    activeDot={{ r: 5 }}
                    dataKey="logged"
                    dot={{ fill: '#0f766e', r: 4 }}
                    name="Check-in"
                    stroke="#0f766e"
                    strokeWidth={3}
                    type="monotone"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </figure>
          <p className="mt-3 text-xs leading-5 text-muted">
            This chart visualizes whether a sample check-in was logged; it does
            not represent a health outcome.
          </p>
        </section>

        <section
          aria-labelledby="alerts-title"
          className="rounded-2xl border border-line bg-white p-6 sm:p-7"
        >
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl bg-teal-light text-teal-dark">
              <AlertCircle aria-hidden="true" size={21} />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                Based on visible demo activity
              </p>
              <h2 className="mt-1 text-lg font-semibold text-navy" id="alerts-title">
                Explainable alerts
              </h2>
            </div>
          </div>
          <ul className="mt-5 space-y-3">
            {doctorDashboard.alerts.map(({ id, title, reason }) => (
              <li
                className="rounded-xl border border-line bg-canvas p-4"
                key={id}
              >
                <h3 className="font-semibold text-navy">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">
                  <span className="font-semibold text-navy">Why this appears:</span>{' '}
                  {reason}
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs leading-5 text-muted">
            Static demo reminders only; these are not medical or AI-generated alerts.
          </p>
        </section>
      </div>
    </div>
  )
}

export default DoctorDashboard
