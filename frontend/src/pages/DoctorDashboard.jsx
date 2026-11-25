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
import EmptyState from '../components/EmptyState.jsx'
import PageHeader from '../components/PageHeader.jsx'
import { usePatientData } from '../context/usePatientData.js'

const PLAN_FIELDS = [
  'medicationInstructions',
  'recoveryInstructions',
  'warningSigns',
  'followUpInstructions',
]

function getWeeklyTrend(checkIns) {
  const today = new Date()

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today)
    date.setDate(today.getDate() - (6 - index))
    const dateKey = date.toDateString()

    return {
      day: date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      }),
      logged: checkIns.some(
        (checkIn) => new Date(checkIn.submitted_at).toDateString() === dateKey,
      )
        ? 1
        : 0,
    }
  })
}

function DoctorDashboard() {
  const {
    patients,
    selectedPatient,
    selectedPatientId,
    recoveryPlans,
    checkIns,
    selectPatient,
  } = usePatientData()
  const patientCheckIns = selectedPatient
    ? checkIns.filter((checkIn) => checkIn.patient_id === selectedPatient.id)
    : []
  const latestCheckIn = patientCheckIns[0] ?? null
  const recoveryPlan = selectedPatient
    ? recoveryPlans[selectedPatient.id]
    : null
  const planFieldsSpecified = recoveryPlan
    ? PLAN_FIELDS.filter((field) => recoveryPlan[field]?.trim()).length
    : 0
  const weeklyTrend = getWeeklyTrend(patientCheckIns)

  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8 sm:py-12 lg:px-12">
      <PageHeader
        description="Review synthetic patient profiles and check-ins shared from the Patient Portal."
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
            {patients.map((patient) => {
              const patientLatestCheckIn = checkIns.find(
                (checkIn) => checkIn.patient_id === patient.id,
              )
              const isSelected = patient.id === selectedPatientId

              return (
                <li className="py-2 first:pt-0 last:pb-0" key={patient.id}>
                  <button
                    aria-pressed={isSelected}
                    className={`flex min-h-16 w-full flex-wrap items-center justify-between gap-3 rounded-xl px-3 py-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal ${
                      isSelected ? 'bg-teal-light/70' : 'hover:bg-canvas'
                    }`}
                    onClick={() => selectPatient(patient.id)}
                    type="button"
                  >
                    <span>
                      <span className="block font-semibold text-navy">
                        {patient.displayName}
                      </span>
                      <span className="mt-1 block text-sm text-muted">{patient.id}</span>
                    </span>
                    <span className="text-left sm:text-right">
                      <span className="block text-sm font-medium text-navy">
                        {patientLatestCheckIn ? 'Check-in recorded' : 'No check-ins yet'}
                      </span>
                      <span className="mt-1 block text-xs text-muted">
                        {patientLatestCheckIn
                          ? new Date(patientLatestCheckIn.submitted_at).toLocaleString()
                          : 'Demo profile'}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
          <p className="mt-5 text-xs leading-5 text-muted">
            Select a profile to review its in-memory demo data.
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
                {selectedPatient?.displayName ?? 'No patient selected'}
              </p>
              <h2 className="mt-1 text-lg font-semibold text-navy" id="recovery-overview-title">
                Recovery overview
              </h2>
            </div>
          </div>
          <dl className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-canvas p-4">
              <dt className="text-sm leading-5 text-muted">Plan fields specified</dt>
              <dd className="mt-3 text-xl font-semibold tracking-tight text-navy">
                {planFieldsSpecified} of {PLAN_FIELDS.length}
              </dd>
            </div>
            <div className="rounded-xl bg-canvas p-4">
              <dt className="text-sm leading-5 text-muted">Check-ins in history</dt>
              <dd className="mt-3 text-xl font-semibold tracking-tight text-navy">
                {patientCheckIns.length}
              </dd>
            </div>
            <div className="rounded-xl bg-canvas p-4">
              <dt className="text-sm leading-5 text-muted">Data source</dt>
              <dd className="mt-3 text-xl font-semibold tracking-tight text-navy">
                Demo only
              </dd>
            </div>
          </dl>
          <p className="mt-5 text-sm leading-6 text-muted">
            {recoveryPlan?.source ?? 'No recovery-plan fixture is available.'}
            {' - '}Missing plan details are shown as not specified in the Patient Portal.
          </p>
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section
          aria-labelledby="latest-checkin-title"
          className="rounded-2xl border border-line bg-white p-6 sm:p-7"
        >
          <div className="mb-5 flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl bg-teal-light text-teal-dark">
              <CalendarCheck2 aria-hidden="true" size={21} />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                {selectedPatient?.displayName ?? 'Patient not selected'}
              </p>
              <h2 className="mt-1 text-lg font-semibold text-navy" id="latest-checkin-title">
                Latest check-in
              </h2>
            </div>
          </div>
          {latestCheckIn ? (
            <div className="rounded-xl border border-line bg-canvas p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-teal-dark">
                  <Activity aria-hidden="true" size={17} />
                  Synthetic check-in
                </span>
                <span className="inline-flex items-center gap-1.5 text-sm text-muted">
                  <Clock3 aria-hidden="true" size={15} />
                  {new Date(latestCheckIn.submitted_at).toLocaleString()}
                </span>
              </div>
              <p className="mt-4 whitespace-pre-wrap break-words leading-7 text-navy">
                {latestCheckIn.reported_symptoms}
              </p>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-xs text-muted">Pain score</dt>
                  <dd className="mt-1 font-medium text-navy">
                    {latestCheckIn.pain_score ?? 'Not provided'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Medication taken</dt>
                  <dd className="mt-1 font-medium text-navy">
                    {latestCheckIn.medication_taken ? 'Yes' : 'No'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Temperature</dt>
                  <dd className="mt-1 font-medium text-navy">
                    {latestCheckIn.temperature_c === null
                      ? 'Not provided'
                      : `${latestCheckIn.temperature_c} °C`}
                  </dd>
                </div>
              </dl>
            </div>
          ) : (
            <EmptyState
              description="A patient's submitted demo check-in will appear here."
              title="No check-in received"
            />
          )}
        </section>

        <section
          aria-labelledby="patient-summary-title"
          className="rounded-2xl border border-line bg-white p-6 sm:p-7"
        >
          <div className="mb-5 flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl bg-teal-light text-teal-dark">
              <FileText aria-hidden="true" size={21} />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                {selectedPatient?.id ?? 'Synthetic profile'}
              </p>
              <h2 className="mt-1 text-lg font-semibold text-navy" id="patient-summary-title">
                Patient summary
              </h2>
            </div>
          </div>
          <p className="rounded-xl bg-canvas p-5 leading-7 text-muted">
            {selectedPatient
              ? `${selectedPatient.displayName} is a synthetic demo profile with ${patientCheckIns.length} check-in${patientCheckIns.length === 1 ? '' : 's'} in the shared history. No medical interpretation is generated.`
              : 'Select a synthetic patient profile to view its summary.'}
          </p>
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section
          aria-labelledby="trend-title"
          className="rounded-2xl border border-line bg-white p-6 sm:p-7"
        >
          <div className="mb-5 flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl bg-teal-light text-teal-dark">
              <Activity aria-hidden="true" size={21} />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                {selectedPatient?.displayName ?? 'Synthetic demo'}
              </p>
              <h2 className="mt-1 text-lg font-semibold text-navy" id="trend-title">
                Recovery trend
              </h2>
            </div>
          </div>
          {patientCheckIns.length === 0 ? (
            <EmptyState
              description="The chart will show daily check-in activity after a demo check-in is submitted."
              title="No trend data yet"
            />
          ) : (
            <>
              <figure>
                <figcaption className="mb-3 text-sm text-muted">
                  Daily check-in activity - synthetic demo data
                </figcaption>
                <div
                  aria-label="Line chart showing daily check-in activity over one sample week"
                  className="h-64 w-full"
                  role="img"
                >
                  <ResponsiveContainer height="100%" width="100%">
                    <LineChart
                      accessibilityLayer
                      data={weeklyTrend}
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
                This chart shows only whether a synthetic check-in was submitted;
                it does not represent a health outcome.
              </p>
            </>
          )}
        </section>

        <section
          aria-labelledby="alerts-title"
          className="rounded-2xl border border-line bg-white p-6 sm:p-7"
        >
          <div className="mb-5 flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl bg-teal-light text-teal-dark">
              <AlertCircle aria-hidden="true" size={21} />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                Demo data boundary
              </p>
              <h2 className="mt-1 text-lg font-semibold text-navy" id="alerts-title">
                Explainable alerts
              </h2>
            </div>
          </div>
          <EmptyState
            description="This frontend does not generate clinical or AI alerts. Submitted check-ins are displayed as entered, without medical interpretation."
            title="Clinical alerting is not active"
          />
        </section>
      </div>
    </div>
  )
}

export default DoctorDashboard
