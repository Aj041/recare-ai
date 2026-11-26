import { useRef, useState } from 'react'
import { ClipboardCheck } from 'lucide-react'
import ErrorState from './ErrorState.jsx'
import { usePatientData } from '../context/usePatientData.js'

function CheckInForm() {
  const { dataMode, selectedPatient, addCheckIn } = usePatientData()
  const [reportedSymptoms, setReportedSymptoms] = useState('')
  const [painScore, setPainScore] = useState('')
  const [medicationTaken, setMedicationTaken] = useState('')
  const [temperature, setTemperature] = useState('')
  const [submissionState, setSubmissionState] = useState('idle')
  const [feedbackMessage, setFeedbackMessage] = useState('')
  const submitting = useRef(false)

  async function handleSubmit(event) {
    event.preventDefault()

    if (submitting.current) {
      return
    }

    setFeedbackMessage('')

    if (!selectedPatient) {
      setSubmissionState('error')
      setFeedbackMessage('Select a patient before submitting a check-in.')
      return
    }

    const originalReport = reportedSymptoms
    const parsedPainScore = painScore === '' ? null : Number(painScore)
    const parsedTemperature = temperature === '' ? null : Number(temperature)

    if (!originalReport.trim()) {
      setSubmissionState('error')
      setFeedbackMessage('Reported symptoms are required.')
      return
    }

    if (dataMode === 'demo' && medicationTaken === '') {
      setSubmissionState('error')
      setFeedbackMessage('Select Yes or No for medication taken.')
      return
    }

    if (
      parsedPainScore === null ||
      !Number.isInteger(parsedPainScore) ||
      parsedPainScore < 0 ||
      parsedPainScore > 10
    ) {
      setSubmissionState('error')
      setFeedbackMessage('Select a pain level from 0 to 10 before submitting.')
      return
    }

    if (parsedTemperature !== null && !Number.isFinite(parsedTemperature)) {
      setSubmissionState('error')
      setFeedbackMessage('Enter a valid temperature in Celsius or leave it blank.')
      return
    }

    const payload =
      dataMode === 'live'
        ? {
            patient_id: selectedPatient.id,
            pain_level: parsedPainScore,
            symptoms: [],
            notes: originalReport,
            ...(parsedTemperature === null
              ? {}
              : { temperature_c: parsedTemperature }),
          }
        : {
            patient_id: selectedPatient.id,
            reported_symptoms: originalReport,
            pain_score: parsedPainScore,
            medication_taken: medicationTaken === 'yes',
            temperature_c: parsedTemperature,
          }

    submitting.current = true
    setSubmissionState('loading')

    try {
      if (dataMode === 'demo') {
        await new Promise((resolve) => window.setTimeout(resolve, 200))
      }
      const savedCheckIn = await addCheckIn(payload)
      setReportedSymptoms('')
      setPainScore('')
      setMedicationTaken('')
      setTemperature('')
      setSubmissionState('success')
      if (dataMode === 'live') {
        setFeedbackMessage(
          savedCheckIn.historyRefreshError
            ? `Check-in saved. Patient history could not be refreshed: ${savedCheckIn.historyRefreshError}`
            : 'Check-in saved and retrieved in patient history.',
        )
      } else {
        setFeedbackMessage(
          `Demo check-in saved at ${new Date(savedCheckIn.submitted_at).toLocaleTimeString([], {
            hour: 'numeric',
            minute: '2-digit',
          })}. It is available in the patient history and Doctor Dashboard.`,
        )
      }
    } catch (error) {
      setSubmissionState('error')
      setFeedbackMessage(
        error instanceof Error
          ? error.message
          : 'The check-in could not be saved.',
      )
    } finally {
      submitting.current = false
    }
  }

  return (
    <section
      aria-labelledby="daily-checkin-title"
      className="surface-panel rounded-2xl border border-line bg-white p-6 sm:p-7"
    >
      <div className="mb-5 flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-xl bg-blue-light text-blue">
          <ClipboardCheck aria-hidden="true" size={21} />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            {selectedPatient ? selectedPatient.displayName : 'Patient not selected'}
          </p>
          <h2 className="mt-1 text-lg font-semibold text-navy" id="daily-checkin-title">
            Daily check-in
          </h2>
        </div>
      </div>

      {!selectedPatient ? (
        <p className="rounded-xl bg-canvas p-4 text-sm leading-6 text-muted">
          Select a {dataMode === 'demo' ? 'demo' : 'live'} patient to continue.
        </p>
      ) : (
        <>
          <p className="surface-quiet mb-5 px-4 py-3 text-sm leading-6 text-muted">
            {dataMode === 'demo'
              ? 'Enter synthetic demo information only. This check-in stays in browser memory and is not sent to a server.'
              : 'Your original symptom report is sent unchanged in notes. Structured symptoms are empty unless you enter or select them separately; this form does not classify free text.'}
          </p>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label
                className="block text-sm font-semibold text-navy"
                htmlFor="reported-symptoms"
              >
                {dataMode === 'live'
                  ? 'Original free-text symptom report'
                  : 'Reported symptoms'}{' '}
                <span aria-hidden="true">*</span>
              </label>
              <textarea
                className="field-control mt-1.5 min-h-24 resize-y px-3 py-2.5 placeholder:text-muted"
                disabled={submissionState === 'loading'}
                id="reported-symptoms"
                onChange={(event) => setReportedSymptoms(event.target.value)}
                placeholder={
                  dataMode === 'demo'
                    ? 'Enter a synthetic demo update'
                    : 'Describe what you are experiencing in your own words'
                }
                required
                value={reportedSymptoms}
              />
            </div>

            <div>
              <label
                className="block text-sm font-semibold text-navy"
                htmlFor="pain-score"
              >
                Pain level <span className="font-normal text-muted">(required, 0-10)</span>
              </label>
              <select
                className="field-control mt-1.5 min-h-11 px-3 sm:max-w-xs"
                disabled={submissionState === 'loading'}
                id="pain-score"
                onChange={(event) => setPainScore(event.target.value)}
                required
                value={painScore}
              >
                <option value="">Select pain level</option>
                {Array.from({ length: 11 }, (_, level) => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>

            {dataMode === 'demo' ? (
              <fieldset disabled={submissionState === 'loading'}>
                <legend className="text-sm font-semibold text-navy">
                  Medication taken <span aria-hidden="true">*</span>
                </legend>
                <div className="mt-2 flex gap-3">
                  {[
                    { value: 'yes', label: 'Yes' },
                    { value: 'no', label: 'No' },
                  ].map(({ value, label }) => (
                    <label
                      className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-line bg-white px-4 text-sm text-navy transition-colors hover:border-teal/40 hover:bg-teal-light/40 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-teal"
                      key={value}
                    >
                      <input
                        checked={medicationTaken === value}
                        name="medication-taken"
                        onChange={() => setMedicationTaken(value)}
                        required
                        type="radio"
                        value={value}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </fieldset>
            ) : null}

            <div>
              <label
                className="block text-sm font-semibold text-navy"
                htmlFor="temperature-c"
              >
                Temperature <span className="font-normal text-muted">(optional, Celsius)</span>
              </label>
              <input
                className="field-control mt-1.5 min-h-11 px-3 sm:max-w-xs"
                disabled={submissionState === 'loading'}
                id="temperature-c"
                onChange={(event) => setTemperature(event.target.value)}
                step="any"
                type="number"
                value={temperature}
              />
            </div>

            {submissionState === 'error' && (
              <ErrorState
                description={feedbackMessage}
                title="Check-in not submitted"
              />
            )}
            {submissionState === 'success' && (
              <p
                aria-live="polite"
                className="rounded-lg bg-teal-light px-4 py-3 text-sm font-medium leading-6 text-teal-dark"
                role="status"
              >
                {feedbackMessage}
              </p>
            )}

            <button
              className="button-primary disabled:cursor-wait disabled:opacity-70"
              disabled={submissionState === 'loading'}
              type="submit"
            >
              {submissionState === 'loading'
                ? dataMode === 'demo'
                  ? 'Saving demo check-in...'
                  : 'Saving check-in...'
                : 'Submit check-in'}
            </button>
          </form>
        </>
      )}
    </section>
  )
}

export default CheckInForm
