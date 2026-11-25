import { useState } from 'react'
import { CircleUserRound, UserPlus } from 'lucide-react'
import ErrorState from './ErrorState.jsx'
import EmptyState from './EmptyState.jsx'
import LoadingState from './LoadingState.jsx'
import { usePatientData } from '../context/usePatientData.js'

function PatientProfile() {
  const {
    dataMode,
    patients,
    selectedPatient,
    selectedPatientId,
    patientListStatus,
    patientListError,
    refreshLivePatients,
    createPatient,
    selectPatient,
  } = usePatientData()
  const [displayName, setDisplayName] = useState('')
  const [patientId, setPatientId] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState('')
  const [phone, setPhone] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [refreshWarning, setRefreshWarning] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleCreatePatient(event) {
    event.preventDefault()

    if (isSubmitting) {
      return
    }

    setErrorMessage('')
    setSuccessMessage('')
    setRefreshWarning('')
    setIsSubmitting(true)

    try {
      const result = await createPatient({
        displayName,
        ...(dataMode === 'demo' ? { id: patientId } : { age, gender, phone }),
      })

      if (result.error) {
        setErrorMessage(result.error)
        return
      }

      setDisplayName('')
      setPatientId('')
      setAge('')
      setGender('')
      setPhone('')
      setSuccessMessage(
        dataMode === 'demo'
          ? `${result.patient.displayName} was added as a synthetic demo patient.`
          : `${result.patient.displayName} was registered with database ID ${result.patient.id}.`,
      )
      if (result.refreshError) {
        setRefreshWarning(
          `Patient creation succeeded, but refreshing the live list failed: ${result.refreshError}`,
        )
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  function handlePatientSelection(event) {
    const result = selectPatient(event.target.value)
    setErrorMessage(result.error ?? '')
    setSuccessMessage('')
  }

  return (
    <section
      aria-labelledby="patient-profile-title"
      className="rounded-2xl border border-line bg-white p-6 sm:p-7"
    >
      <div className="mb-5 flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-xl bg-teal-light text-teal-dark">
          <CircleUserRound aria-hidden="true" size={21} />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            {dataMode === 'demo' ? 'Synthetic patient profiles' : 'Live backend records'}
          </p>
          <h2 className="mt-1 text-lg font-semibold text-navy" id="patient-profile-title">
            Patient profile
          </h2>
        </div>
      </div>

      {dataMode === 'live' &&
      ['idle', 'loading'].includes(patientListStatus) ? (
        <LoadingState message="Loading live patients..." />
      ) : null}
      {dataMode === 'live' && patientListError ? (
        <div className="space-y-3">
          <ErrorState
            description={patientListError}
            title="Live patient list unavailable"
          />
          <button
            className="min-h-10 rounded-full border border-line px-4 text-sm font-semibold text-navy hover:bg-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
            onClick={() => refreshLivePatients()}
            type="button"
          >
            Retry patient list
          </button>
        </div>
      ) : null}
      {dataMode === 'live' &&
      patientListStatus === 'success' &&
      patients.length === 0 ? (
        <EmptyState
          description="Register a live patient below. Demo profiles are not included in this list."
          title="No live patients yet"
        />
      ) : null}
      {patients.length > 0 && patientListStatus !== 'loading' ? (
      <div className="rounded-xl bg-canvas p-4">
        <label
          className="block text-sm font-semibold text-navy"
          htmlFor="selected-patient"
        >
          Select a {dataMode === 'demo' ? 'demo' : 'live'} patient
        </label>
        <select
          className="mt-2 min-h-11 w-full rounded-lg border border-line bg-white px-3 text-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
          id="selected-patient"
          onChange={handlePatientSelection}
          value={selectedPatientId}
        >
          {patients.map((patient) => (
            <option key={patient.id} value={patient.id}>
              {patient.displayName} ({patient.id})
            </option>
          ))}
        </select>

        {selectedPatient ? (
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
                Patient name
              </dt>
              <dd className="mt-1 font-semibold text-navy">
                {selectedPatient.displayName}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
                {dataMode === 'demo' ? 'Unique demo ID' : 'Database patient ID'}
              </dt>
              <dd className="mt-1 font-semibold text-navy">{selectedPatient.id}</dd>
            </div>
          </dl>
        ) : (
          <p className="mt-4 text-sm text-muted">Select a demo patient to continue.</p>
        )}
      </div>
      ) : null}

      <form className="mt-5 space-y-4" onSubmit={handleCreatePatient}>
        <h3 className="flex items-center gap-2 font-semibold text-navy">
          <UserPlus aria-hidden="true" size={18} />
          {dataMode === 'demo' ? 'Add a synthetic demo patient' : 'Register a live patient'}
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              className="block text-sm font-medium text-navy"
              htmlFor="new-patient-name"
            >
              Patient name <span aria-hidden="true">*</span>
            </label>
            <input
              autoComplete="off"
              className="mt-1.5 min-h-11 w-full rounded-lg border border-line px-3 text-navy placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
              id="new-patient-name"
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder={
                dataMode === 'demo'
                  ? 'Example: Demo Patient 03'
                  : 'Synthetic test name'
              }
              required
              value={displayName}
            />
          </div>
          {dataMode === 'demo' ? (
          <div>
            <label
              className="block text-sm font-medium text-navy"
              htmlFor="new-patient-id"
            >
              Unique patient ID <span aria-hidden="true">*</span>
            </label>
            <input
              autoComplete="off"
              className="mt-1.5 min-h-11 w-full rounded-lg border border-line px-3 text-navy placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
              id="new-patient-id"
              onChange={(event) => setPatientId(event.target.value)}
              placeholder="Example: P003"
              required
              value={patientId}
            />
          </div>
          ) : (
            <>
              <div>
                <label
                  className="block text-sm font-medium text-navy"
                  htmlFor="new-patient-age"
                >
                  Age <span className="font-normal text-muted">(optional)</span>
                </label>
                <input
                  className="mt-1.5 min-h-11 w-full rounded-lg border border-line px-3 text-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
                  id="new-patient-age"
                  min="0"
                  onChange={(event) => setAge(event.target.value)}
                  step="1"
                  type="number"
                  value={age}
                />
              </div>
              <div>
                <label
                  className="block text-sm font-medium text-navy"
                  htmlFor="new-patient-gender"
                >
                  Gender <span className="font-normal text-muted">(optional)</span>
                </label>
                <input
                  className="mt-1.5 min-h-11 w-full rounded-lg border border-line px-3 text-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
                  id="new-patient-gender"
                  onChange={(event) => setGender(event.target.value)}
                  value={gender}
                />
              </div>
              <div>
                <label
                  className="block text-sm font-medium text-navy"
                  htmlFor="new-patient-phone"
                >
                  Phone <span className="font-normal text-muted">(optional)</span>
                </label>
                <input
                  className="mt-1.5 min-h-11 w-full rounded-lg border border-line px-3 text-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
                  id="new-patient-phone"
                  onChange={(event) => setPhone(event.target.value)}
                  type="tel"
                  value={phone}
                />
              </div>
            </>
          )}
        </div>
        <p className="text-xs leading-5 text-muted">
          {dataMode === 'demo'
            ? 'This creates an in-memory demo profile only; no patient record is sent to a server.'
            : 'Use synthetic test information only. The backend assigns the patient ID; no demo record is sent.'}
        </p>
        <button
          className="min-h-11 rounded-full bg-teal px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-dark focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal disabled:cursor-wait disabled:opacity-70"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting
            ? 'Saving patient...'
            : dataMode === 'demo'
              ? 'Add demo patient'
              : 'Register live patient'}
        </button>
        {errorMessage && (
          <ErrorState
            description={errorMessage}
            title="Patient profile not added"
          />
        )}
        {successMessage && (
          <p
            aria-live="polite"
            className="rounded-lg bg-teal-light px-4 py-3 text-sm font-medium text-teal-dark"
            role="status"
          >
            {successMessage}
          </p>
        )}
        {refreshWarning ? (
          <ErrorState
            description={refreshWarning}
            title="Live list refresh needs attention"
          />
        ) : null}
      </form>
    </section>
  )
}

export default PatientProfile
