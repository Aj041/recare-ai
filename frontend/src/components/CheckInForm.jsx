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
      setFeedbackMessage('Select a demo patient before submitting a check-in.')
      return
    }

    const symptoms = reportedSymptoms.trim()
    const parsedPainScore = painScore === '' ? null : Number(painScore)
    const parsedTemperature = temperature === '' ? null : Number(temperature)

    if (!symptoms) {
      setSubmissionState('error')
      setFeedbackMessage('Reported symptoms are required.')
      return
    }

    if (medicationTaken === '') {
      setSubmissionState('error')
      setFeedbackMessage('Select Yes or No for medication taken.')
      return
    }

    if (
      parsedPainScore !== null &&
      (!Number.isInteger(parsedPainScore) ||
        parsedPainScore < 0 ||
        parsedPainScore > 10)
    ) {
      setSubmissionState('error')
      setFeedbackMessage('Pain score must be a whole number from 0 to 10.')
      return
    }

    if (parsedTemperature !== null && !Number.isFinite(parsedTemperature)) {
      setSubmissionState('error')
      setFeedbackMessage('Enter a valid temperature in Celsius or leave it blank.')
      return
    }

    const payload = {
      patient_id: selectedPatient.id,
      reported_symptoms: symptoms,
      pain_score: parsedPainScore,
      medication_taken: medicationTaken === 'yes',
      temperature_c: parsedTemperature,
    }

    submitting.current = true
    setSubmissionState('loading')

    try {
      await new Promise((resolve) => window.setTimeout(resolve, 200))
      const savedCheckIn = addCheckIn(payload)
      setReportedSymptoms('')
      setPainScore('')
      setMedicationTaken('')
      setTemperature('')
      setSubmissionState('success')
      setFeedbackMessage(
        `Demo check-in saved at ${new Date(savedCheckIn.submitted_at).toLocaleTimeString([], {
          hour: 'numeric',
          minute: '2-digit',
        })}. It is available in the patient history and Doctor Dashboard.`,
      )
    } catch (error) {
      setSubmissionState('error')
      setFeedbackMessage(
        error instanceof Error
          ? error.message
          : 'The demo check-in could not be saved.',
      )
    } finally {
      submitting.current = false
    }
  }

  return (
    <section
      aria-labelledby="daily-checkin-title"
      className="rounded-2xl border border-line bg-white p-6 sm:p-7"
    >
      <div className="mb-5 flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-xl bg-teal-light text-teal-dark">
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
      ) : dataMode === 'live' ? (
        <div
          className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950"
          role="status"
        >
          <h3 className="font-semibold">Live check-in submission is paused</h3>
          <p className="mt-2">
            The verified backend accepts a symptoms array and a notes string,
            but Person 2 has not confirmed which field preserves the original
            free-text symptom report. No request is sent until that mapping is
            confirmed; this prevents local symptom classification or loss of
            the patient&apos;s wording.
          </p>
          <p className="mt-2">
            The backend also requires a pain level, while this form allows pain
            to be omitted. No pain value will be filled in automatically.
            Medication taken is not supported by this backend contract and will
            not be reported as saved.
          </p>
        </div>
      ) : (
        <>
          <p className="mb-5 rounded-lg bg-canvas px-4 py-3 text-sm leading-6 text-muted">
            Enter synthetic demo information only. This check-in stays in
            browser memory and is not sent to a server.
          </p>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label
                className="block text-sm font-semibold text-navy"
                htmlFor="reported-symptoms"
              >
                Reported symptoms <span aria-hidden="true">*</span>
              </label>
              <textarea
                className="mt-1.5 min-h-24 w-full resize-y rounded-lg border border-line px-3 py-2.5 text-navy placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
                disabled={submissionState === 'loading'}
                id="reported-symptoms"
                onChange={(event) => setReportedSymptoms(event.target.value)}
                placeholder="Enter a synthetic demo update"
                required
                value={reportedSymptoms}
              />
            </div>

            <div>
              <label
                className="block text-sm font-semibold text-navy"
                htmlFor="pain-score"
              >
                Pain score <span className="font-normal text-muted">(optional, 0-10)</span>
              </label>
              <input
                className="mt-1.5 min-h-11 w-full rounded-lg border border-line px-3 text-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal sm:max-w-xs"
                disabled={submissionState === 'loading'}
                id="pain-score"
                max="10"
                min="0"
                onChange={(event) => setPainScore(event.target.value)}
                step="1"
                type="number"
                value={painScore}
              />
            </div>

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
                    className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-line px-4 text-sm text-navy focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-teal"
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

            <div>
              <label
                className="block text-sm font-semibold text-navy"
                htmlFor="temperature-c"
              >
                Temperature <span className="font-normal text-muted">(optional, Celsius)</span>
              </label>
              <input
                className="mt-1.5 min-h-11 w-full rounded-lg border border-line px-3 text-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal sm:max-w-xs"
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
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-teal px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-dark focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal disabled:cursor-wait disabled:opacity-70"
              disabled={submissionState === 'loading'}
              type="submit"
            >
              {submissionState === 'loading' ? 'Saving demo check-in...' : 'Submit check-in'}
            </button>
          </form>
        </>
      )}
    </section>
  )
}

export default CheckInForm
