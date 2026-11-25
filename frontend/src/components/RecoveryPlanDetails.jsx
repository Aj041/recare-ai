import { normalizeRecoveryPlan } from '../utils/aiOutputAdapters.js'

function InformationList({ title, items, emptyText = 'Not specified' }) {
  return (
    <section className="rounded-xl border border-line p-4">
      <h3 className="text-sm font-semibold text-navy">{title}</h3>
      {items.length > 0 ? (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-muted">
          {items.map((item, index) => (
            <li key={`${title}-${index}`}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm leading-6 text-muted">{emptyText}</p>
      )}
    </section>
  )
}

function RecoveryPlanDetails({ plan }) {
  const normalizedPlan = normalizeRecoveryPlan(plan)

  if (!normalizedPlan) {
    return <p className="text-sm text-muted">Not provided</p>
  }

  return (
    <div className="space-y-4">
      <section aria-label="Medications">
        <h3 className="text-sm font-semibold text-navy">
          Medications
        </h3>
        {normalizedPlan.medications.length > 0 ? (
          <ul className="mt-2 grid gap-3 sm:grid-cols-2">
            {normalizedPlan.medications.map((medication, index) => (
              <li
                className="rounded-xl border border-line bg-white p-4"
                key={`${medication.name}-${index}`}
              >
                <p className="font-semibold text-navy">{medication.name}</p>
                <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-xs text-muted">Dose</dt>
                    <dd className="mt-1 text-navy">{medication.dose}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">Frequency</dt>
                    <dd className="mt-1 text-navy">{medication.frequency}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-xs text-muted">Duration</dt>
                    <dd className="mt-1 text-navy">{medication.duration}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 rounded-xl border border-line p-4 text-sm text-muted">
            Not specified
          </p>
        )}
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        <InformationList
          items={normalizedPlan.recovery_instructions}
          title="Recovery instructions"
        />
        <InformationList
          items={normalizedPlan.warning_signs}
          title="Warning signs"
        />
        <InformationList items={normalizedPlan.follow_up} title="Follow-up" />
        <InformationList
          emptyText={
            normalizedPlan.has_missing_information
              ? 'No missing information listed.'
              : 'Not specified'
          }
          items={normalizedPlan.missing_information}
          title="Missing information"
        />
      </div>
    </div>
  )
}

export default RecoveryPlanDetails
