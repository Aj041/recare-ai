import { ClipboardList } from 'lucide-react'
import EmptyState from './EmptyState.jsx'
import { usePatientData } from '../context/usePatientData.js'

const planSections = [
  { key: 'medicationInstructions', label: 'Medication instructions' },
  { key: 'recoveryInstructions', label: 'Recovery instructions' },
  { key: 'warningSigns', label: 'Warning signs' },
  { key: 'followUpInstructions', label: 'Follow-up instructions' },
]

function RecoveryPlan() {
  const { selectedPatient, recoveryPlans } = usePatientData()
  const plan = selectedPatient
    ? recoveryPlans[selectedPatient.id]
    : null

  return (
    <section
      aria-labelledby="recovery-plan-title"
      className="rounded-2xl border border-line bg-white p-6 sm:p-7"
    >
      <div className="mb-5 flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-xl bg-teal-light text-teal-dark">
          <ClipboardList aria-hidden="true" size={21} />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            {selectedPatient ? selectedPatient.displayName : 'Patient not selected'}
          </p>
          <h2 className="mt-1 text-lg font-semibold text-navy" id="recovery-plan-title">
            Recovery plan
          </h2>
        </div>
      </div>

      {!plan ? (
        <EmptyState
          description="Select a demo patient to view the associated recovery-plan fixture."
          title="No patient selected"
        />
      ) : (
        <>
          <p className="mb-4 rounded-lg bg-teal-light px-4 py-3 text-sm font-medium text-teal-dark">
            {plan.source}. This fixture is not generated from or analyzed from a PDF.
          </p>
          <dl className="grid gap-3 sm:grid-cols-2">
            {planSections.map(({ key, label }) => {
              const value = plan[key]?.trim() || 'Not specified'

              return (
                <div className="rounded-xl border border-line p-4" key={key}>
                  <dt className="text-sm font-semibold text-navy">{label}</dt>
                  <dd className="mt-2 text-sm leading-6 text-muted">{value}</dd>
                </div>
              )
            })}
          </dl>
        </>
      )}
    </section>
  )
}

export default RecoveryPlan
