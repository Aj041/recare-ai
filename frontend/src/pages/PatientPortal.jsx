import {
  CheckCircle2,
  Circle,
  Clock3,
  FileText,
  UserRound,
  UploadCloud,
} from 'lucide-react'
import EmptyState from '../components/EmptyState.jsx'
import PageHeader from '../components/PageHeader.jsx'
import { mockData } from '../data/mockData.js'

const statusIcons = {
  Ready: CheckCircle2,
  'In progress': Clock3,
  'Not started': Circle,
}

function PatientPortal() {
  const { patient, recoveryPlan, dailyCheckIn } = mockData

  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8 sm:py-12 lg:px-12">
      <PageHeader
        description="A sample space for shared recovery information and check-ins."
        eyebrow="RE:CARE AI - Patient Portal"
        title="Your recovery space"
      >
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-teal-light px-3 py-2 text-xs font-semibold text-teal-dark">
          <span aria-hidden="true" className="size-2 rounded-full bg-teal" />
          Synthetic demo
        </span>
      </PageHeader>

      <div className="mt-7 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <section
          aria-labelledby="patient-profile-title"
          className="rounded-2xl border border-line bg-white p-6 sm:p-7"
        >
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl bg-teal-light text-teal-dark">
              <UserRound aria-hidden="true" size={21} />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                Patient profile
              </p>
              <h2 className="mt-1 text-lg font-semibold text-navy" id="patient-profile-title">
                {patient.displayName}
              </h2>
            </div>
          </div>
          <dl className="mt-6 divide-y divide-line">
            <div className="flex justify-between gap-4 py-3">
              <dt className="text-sm text-muted">Demo reference</dt>
              <dd className="text-right text-sm font-semibold text-navy">
                {patient.demoId}
              </dd>
            </div>
            <div className="flex justify-between gap-4 py-3">
              <dt className="text-sm text-muted">Profile</dt>
              <dd className="text-right text-sm font-semibold text-navy">
                {patient.profileStatus}
              </dd>
            </div>
            <div className="flex justify-between gap-4 py-3">
              <dt className="text-sm text-muted">Workflow</dt>
              <dd className="text-right text-sm font-semibold text-navy">
                {patient.programLabel}
              </dd>
            </div>
          </dl>
        </section>

        <section
          aria-labelledby="document-title"
          className="rounded-2xl border border-line bg-white p-6 sm:p-7"
        >
          <div className="mb-5 flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl bg-teal-light text-teal-dark">
              <UploadCloud aria-hidden="true" size={21} />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                Documents
              </p>
              <h2 className="mt-1 text-lg font-semibold text-navy" id="document-title">
                Discharge PDF upload
              </h2>
            </div>
          </div>
          <EmptyState
            description="No sample document is attached. PDF upload and processing are not connected in this demo."
            icon={FileText}
            title="No document uploaded"
          />
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section
          aria-labelledby="recovery-plan-title"
          className="rounded-2xl border border-line bg-white p-6 sm:p-7"
        >
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Shared information
            </p>
            <h2 className="mt-1 text-xl font-semibold text-navy" id="recovery-plan-title">
              Recovery plan
            </h2>
          </div>
          <ol className="space-y-3">
            {recoveryPlan.map(({ id, title, description, status }) => {
              const StatusIcon = statusIcons[status]

              return (
                <li
                  className="flex items-start gap-3 rounded-xl border border-line p-4"
                  key={id}
                >
                  <StatusIcon
                    aria-hidden="true"
                    className="mt-0.5 shrink-0 text-teal"
                    size={19}
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-navy">{title}</h3>
                    <p className="mt-1 text-sm leading-6 text-muted">{description}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-canvas px-2.5 py-1 text-xs font-semibold text-muted">
                    {status}
                  </span>
                </li>
              )
            })}
          </ol>
        </section>

        <section
          aria-labelledby="daily-checkin-title"
          className="rounded-2xl border border-line bg-white p-6 sm:p-7"
        >
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Stay connected
            </p>
            <h2 className="mt-1 text-xl font-semibold text-navy" id="daily-checkin-title">
              Daily check-in
            </h2>
          </div>
          {dailyCheckIn ? (
            <div className="rounded-xl border border-line bg-canvas p-5">
              <p className="font-semibold text-navy">{dailyCheckIn.status}</p>
              <p className="mt-2 text-sm leading-6 text-muted">
                {dailyCheckIn.message}
              </p>
            </div>
          ) : (
            <EmptyState
              description="There is no sample check-in to show yet. Check-in submission is not connected in this demo."
              title="No check-in recorded"
            />
          )}
        </section>
      </div>

      <p className="mt-6 flex items-start gap-2 text-sm leading-6 text-muted">
        <FileText aria-hidden="true" className="mt-0.5 shrink-0" size={17} />
        This page contains synthetic sample content only; it is not medical advice
        or a real patient record.
      </p>
    </div>
  )
}

export default PatientPortal
