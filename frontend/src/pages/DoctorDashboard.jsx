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
import RecoveryCompanion from '../components/RecoveryCompanion.jsx'
import MedicationManagement from '../components/MedicationManagement.jsx'
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
    dataMode,
    patients,
    checkIns,
    alertEvaluations,
    selectedPatient,
    hasPatientHistoryChanged,
    patientListStatus,
    patientHistoryStatus,
  } = usePatientData()
  const isDemo = dataMode === 'demo'
  const selectedEvaluation = normalizeAlertEvaluation(
    selectedPatient ? alertEvaluations[selectedPatient.id] : null,
  )
  const displayedAlertIds = selectedEvaluation.alerts.map(
    (alert) => alert.alert_id,
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
      label: isDemo ? 'Registered demo patients' : 'Live patients',
      value:
        !isDemo && ['idle', 'loading'].includes(patientListStatus)
          ? 'Loading'
          : !isDemo && patientListStatus === 'error'
            ? 'Unavailable'
            : patients.length,
      description: isDemo
        ? 'Synthetic profiles available to this session'
        : 'Records returned by the backend patient-list endpoint',
    },
    {
      icon: ClipboardList,
      label: isDemo ? 'Submitted check-ins' : 'Selected patient check-ins',
      value:
        !isDemo && patientHistoryStatus === 'loading'
          ? 'Loading'
          : !isDemo && patientHistoryStatus === 'error'
            ? 'Unavailable'
            : checkIns.length,
      description: isDemo
        ? 'In-memory check-ins across all demo patients'
        : patientHistoryStatus === 'loading'
          ? 'Loading selected patient history'
          : patientHistoryStatus === 'error'
            ? 'Selected patient history could not be loaded'
          : 'History endpoint data for the currently selected patient only',
    },
    {
      icon: Activity,
      label: isDemo ? 'Patients with check-ins' : 'Patients with check-ins',
      value: isDemo ? patientsWithCheckIns : 'Unavailable',
      description: isDemo
        ? 'Unique demo patients with at least one entry'
        : 'A global history count is not available from the backend contract',
    },
    {
      icon: AlertTriangle,
      label: isDemo ? 'Demo alerts for review' : 'Explainable alerts',
      value: isDemo ? alertsRequiringReview : 'Unavailable',
      description: isDemo
        ? 'Returned synthetic alert records across demo patients'
        : 'No alert-engine evaluation endpoint is available',
    },
  ]

  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8 sm:py-12 lg:px-12">
      <PageHeader
        description={
          isDemo
            ? 'Review synthetic patient profiles, patient-reported check-ins, and clearly labeled demo fixtures.'
            : 'Review live patient records returned by the backend. AI summaries and explainable alert evaluation are not connected.'
        }
        eyebrow="RE:CARE AI - Doctor Dashboard"
        title="Care team overview"
      >
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-teal-light px-3 py-2 text-xs font-semibold text-teal-dark">
          <span aria-hidden="true" className="size-2 rounded-full bg-teal" />
          {isDemo ? 'Synthetic demo data' : 'Live backend data'}
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
        <PatientSummary displayedAlertIds={displayedAlertIds} />
        <PatientHistory />
      </div>

      <div className="mt-6">
        <RecoveryCompanion />
      </div>

      <div className="mt-6">
        <MedicationManagement />
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
            {isDemo
              ? 'Static synthetic fixtures - no clinical rules run'
              : 'No live alert-engine evaluation is connected'}
          </p>
          <h2 className="mt-1 text-lg font-semibold text-navy" id="demo-alerts-title">
            {isDemo ? 'Explainable demo alerts' : 'Explainable alerts'}
          </h2>
        </div>
        {isDemo &&
        selectedPatient &&
        hasPatientHistoryChanged(selectedPatient.id) ? (
          <p
            className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900"
            role="status"
          >
            This patient&apos;s check-in history has changed since the static
            demo evaluation was prepared. The fixture has not been recomputed.
          </p>
        ) : null}
        {isDemo ? (
          <>
            <AlertEvaluationState evaluation={selectedEvaluation} />
            {selectedEvaluation.alerts.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {selectedEvaluation.alerts.map((alert) => (
              <AlertCard
                alert={alert}
                key={alert.alert_id}
              />
            ))}
          </div>
            ) : null}
          </>
        ) : (
          <div
            className="rounded-xl border border-line bg-canvas p-4 text-sm leading-6 text-muted"
            role="status"
          >
            Live explainable alert evaluation is unavailable. The verified
            backend&apos;s alert route returns stored database alerts, not the
            alert-engine output, so those records are not presented here as
            explainable AI alerts.
          </div>
        )}
      </section>
    </div>
  )
}

export default DoctorDashboard
