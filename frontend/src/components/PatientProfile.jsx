import { useState } from 'react'
import { CircleUserRound, UserPlus } from 'lucide-react'
import ErrorState from './ErrorState.jsx'
import { usePatientData } from '../context/usePatientData.js'

function PatientProfile() {
  const {
    patients,
    selectedPatient,
    selectedPatientId,
    createPatient,
    selectPatient,
  } = usePatientData()
  const [displayName, setDisplayName] = useState('')
  const [patientId, setPatientId] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  function handleCreatePatient(event) {
    event.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    const result = createPatient({ displayName, id: patientId })

    if (result.error) {
      setErrorMessage(result.error)
      return
    }

    setDisplayName('')
    setPatientId('')
    setSuccessMessage(`${result.patient.displayName} was added as a demo patient.`)
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
            Synthetic patient profiles
          </p>
          <h2 className="mt-1 text-lg font-semibold text-navy" id="patient-profile-title">
            Patient profile
          </h2>
        </div>
      </div>

      <div className="rounded-xl bg-canvas p-4">
        <label
          className="block text-sm font-semibold text-navy"
          htmlFor="selected-patient"
        >
          Select a demo patient
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
                Unique demo ID
              </dt>
              <dd className="mt-1 font-semibold text-navy">{selectedPatient.id}</dd>
            </div>
          </dl>
        ) : (
          <p className="mt-4 text-sm text-muted">Select a demo patient to continue.</p>
        )}
      </div>

      <form className="mt-5 space-y-4" onSubmit={handleCreatePatient}>
        <h3 className="flex items-center gap-2 font-semibold text-navy">
          <UserPlus aria-hidden="true" size={18} />
          Add a synthetic demo patient
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
              placeholder="Example: Demo Patient 03"
              required
              value={displayName}
            />
          </div>
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
        </div>
        <p className="text-xs leading-5 text-muted">
          This creates an in-memory demo profile only; no patient record is sent
          to a server.
        </p>
        <button
          className="min-h-11 rounded-full bg-teal px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-dark focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal"
          type="submit"
        >
          Add demo patient
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
      </form>
    </section>
  )
}

export default PatientProfile
