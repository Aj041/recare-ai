import { ClipboardList } from 'lucide-react'
import EmptyState from './EmptyState.jsx'
import ErrorState from './ErrorState.jsx'
import LoadingState from './LoadingState.jsx'
import RecoveryPlanDetails from './RecoveryPlanDetails.jsx'
import { usePatientData } from '../context/usePatientData.js'

function RecoveryPlan() {
  const {
    dataMode,
    selectedPatient,
    recoveryPlans,
    recoveryPlanStatus,
    recoveryPlanError,
    refreshLatestCarePlan,
    updateRecoveryPlanAdherence,
  } = usePatientData()
  const plan = selectedPatient
    ? recoveryPlans[selectedPatient.id]
    : null
  const isLoading =
    dataMode === 'live' &&
    selectedPatient &&
    ['idle', 'loading'].includes(recoveryPlanStatus)

  return (
    <section
      aria-labelledby="recovery-plan-title"
      className="surface-panel rounded-2xl border border-line bg-white p-6 sm:p-7"
    >
      <div className="mb-5 flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-xl bg-blue-light text-blue">
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

      {!selectedPatient ? (
        <EmptyState
          description="Select a patient to view their recovery plan."
          title="No patient selected"
        />
      ) : isLoading ? (
        <LoadingState message="Loading this patient's latest saved recovery plan..." />
      ) : recoveryPlanStatus === 'error' && !plan ? (
        <div className="space-y-3">
          <ErrorState
            description={recoveryPlanError}
            title="Recovery plan unavailable"
          />
          <button
            className="min-h-10 rounded-full border border-line px-4 text-sm font-semibold text-navy hover:bg-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
            onClick={() => refreshLatestCarePlan(selectedPatient.id)}
            type="button"
          >
            Retry recovery plan
          </button>
        </div>
      ) : !plan ? (
        <EmptyState
          description={
            dataMode === 'demo'
              ? 'No recovery-plan fixture is associated with this demo patient.'
              : 'No saved recovery plan was found for this patient. Upload a discharge PDF to create one.'
          }
          title="No recovery plan yet"
        />
      ) : (
        <>
          {recoveryPlanStatus === 'error' ? (
            <div className="mb-4 space-y-3">
              <ErrorState
                description={recoveryPlanError}
                title="Could not refresh the saved plan"
              />
              <button
                className="min-h-10 rounded-full border border-line px-4 text-sm font-semibold text-navy hover:bg-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
                onClick={() => refreshLatestCarePlan(selectedPatient.id)}
                type="button"
              >
                Retry recovery plan
              </button>
            </div>
          ) : null}
          <p className="mb-4 rounded-xl border border-teal/15 bg-teal-light/70 px-4 py-3 text-sm leading-6 text-teal-dark">
            {dataMode === 'demo'
              ? 'Synthetic demo fixture. This content is not generated from or analyzed from a PDF.'
              : 'Structured information interpreted from this patient’s saved discharge document. It is not a diagnosis or prescription.'}
            {' '}Missing clinical details are not filled in.
          </p>
          <RecoveryPlanDetails
            dataMode={dataMode}
            onUpdateAdherence={(itemId, payload) =>
              updateRecoveryPlanAdherence(selectedPatient.id, itemId, payload)
            }
            plan={plan}
          />
        </>
      )}
    </section>
  )
}

export default RecoveryPlan
