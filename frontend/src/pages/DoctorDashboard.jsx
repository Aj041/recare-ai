import {
  Activity,
  AlertTriangle,
  ClipboardList,
  UsersRound,
} from 'lucide-react'
import AlertCard from '../components/AlertCard.jsx'
import DashboardMetricCard from '../components/DashboardMetricCard.jsx'
import PageHeader from '../components/PageHeader.jsx'
import PatientHistory from '../components/PatientHistory.jsx'
import PatientList from '../components/PatientList.jsx'
import PatientOverview from '../components/PatientOverview.jsx'
import PatientSummary from '../components/PatientSummary.jsx'
import RecoveryTrendChart from '../components/RecoveryTrendChart.jsx'
import { usePatientData } from '../context/usePatientData.js'
import { normalizeAlertEvaluation } from '../utils/aiOutputAdapters.js'

function AlertEvaluationState({ evaluation }) {
  const messageByState = {
    unavailable: {
      title: 'Alert evaluation unavailable',
      description:
        'No evaluation output is available for this patient. Missing evaluation data does not indicate that the patient is well.',
    },
    insufficient_history: {
      title: 'Insufficient check-in history',
      description:
        evaluation.insufficient_history_reason ||
        'No reason was included in this evaluation output.',
    },
    completed_no_alerts: {
      title: 'Evaluation completed with no alerts',
      description:
        'No alerts were returned. This does not indicate that the patient is well.',
    },
    alerts_returned: {
      title: 'Alerts returned for clinician review',
      description:
        'The following synthetic alert output is displayed for review; no alert logic runs in this dashboard.',
    },
  }
  const message = messageByState[evaluation.state]

  return (
    <div
      className="mb-4 rounded-xl border border-line bg-canvas p-4"
      role="status"
    >
      <h3 className="font-semibold text-navy">{message.title}</h3>
      <p className="mt-1 text-sm leading-6 text-muted">{message.description}</p>
    </div>
  )
}

function DoctorDashboard() {
  const {
    patients,
    checkIns,
    alertEvaluations,
    selectedPatient,
  } = usePatientData()
  const selectedEvaluation = normalizeAlertEvaluation(
    selectedPatient ? alertEvaluations[selectedPatient.id] : null,
  )
  const patientsWithCheckIns = patients.filter((patient) =>
    checkIns.some((checkIn) => checkIn.patient_id === patient.id),
  ).length
  const alertsRequiringReview = patients.reduce(
    (total, patient) =>
      total +
      normalizeAlertEvaluation(alertEvaluations[patient.id]).alerts.length,
    0,
  )

  const metrics = [
    {
      icon: UsersRound,
      label: 'Registered demo patients',
      value: patients.length,
      description: 'Synthetic profiles available to this session',
    },
    {
      icon: ClipboardList,
      label: 'Submitted check-ins',
      value: checkIns.length,
      description: 'In-memory check-ins across all demo patients',
    },
    {
      icon: Activity,
      label: 'Patients with check-ins',
      value: patientsWithCheckIns,
      description: 'Unique demo patients with at least one entry',
    },
    {
      icon: AlertTriangle,
      label: 'Demo alerts for review',
      value: alertsRequiringReview,
      description: 'Returned synthetic alert records across demo patients',
    },
  ]

  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8 sm:py-12 lg:px-12">
      <PageHeader
        description="Review synthetic patient profiles, patient-reported check-ins, and clearly labeled demo fixtures."
        eyebrow="RE:CARE AI - Doctor Dashboard"
        title="Care team overview"
      >
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-teal-light px-3 py-2 text-xs font-semibold text-teal-dark">
          <span aria-hidden="true" className="size-2 rounded-full bg-teal" />
          Synthetic demo data
        </span>
      </PageHeader>

      <section
        aria-label="Dashboard overview metrics"
        className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {metrics.map((metric) => (
          <DashboardMetricCard key={metric.label} {...metric} />
        ))}
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <PatientList />
        <PatientOverview />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <PatientSummary />
        <PatientHistory />
      </div>

      <div className="mt-6">
        <RecoveryTrendChart />
      </div>

      <section
        aria-labelledby="demo-alerts-title"
        className="mt-6 rounded-2xl border border-line bg-white p-6 sm:p-7"
      >
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Static synthetic fixtures - no clinical rules run
          </p>
          <h2 className="mt-1 text-lg font-semibold text-navy" id="demo-alerts-title">
            Explainable demo alerts
          </h2>
        </div>
        <AlertEvaluationState evaluation={selectedEvaluation} />
        {selectedEvaluation.alerts.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {selectedEvaluation.alerts.map((alert, index) => (
              <AlertCard
                alert={alert}
                key={alert.alert_id ?? `${alert.alert_type ?? 'alert'}-${index}`}
              />
            ))}
          </div>
        ) : null}
      </section>
    </div>
  )
}

export default DoctorDashboard
