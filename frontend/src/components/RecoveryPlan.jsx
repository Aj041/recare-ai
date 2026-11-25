import { ClipboardList } from 'lucide-react'
import EmptyState from './EmptyState.jsx'
import RecoveryPlanDetails from './RecoveryPlanDetails.jsx'
import { usePatientData } from '../context/usePatientData.js'

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
            Synthetic demo fixture. This content is not generated from or
            analyzed from a PDF. Missing clinical details are not filled in.
          </p>
          <RecoveryPlanDetails plan={plan} />
        </>
      )}
    </section>
  )
}

export default RecoveryPlan
