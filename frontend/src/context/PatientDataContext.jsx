import {
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react'
import { mockData, syntheticRecoveryPlanFixture } from '../data/mockData.js'
import PatientDataContext from './patientDataContext.js'

function PatientDataProvider({ children }) {
  const [patients, setPatients] = useState(mockData.patients)
  const [selectedPatientId, setSelectedPatientId] = useState(
    mockData.selectedPatientId,
  )
  const [recoveryPlans, setRecoveryPlans] = useState(
    mockData.recoveryPlansByPatientId,
  )
  const [checkIns, setCheckIns] = useState(mockData.initialCheckIns)
  const checkInSequence = useRef(0)
  const selectedPatient =
    patients.find((patient) => patient.id === selectedPatientId) ?? null

  const createPatient = useCallback(
    ({ displayName, id }) => {
      const normalizedName = displayName.trim()
      const normalizedId = id.trim().toUpperCase()

      if (!normalizedName || !normalizedId) {
        return { error: 'Patient name and ID are required.' }
      }

      if (patients.some((patient) => patient.id.toLowerCase() === normalizedId.toLowerCase())) {
        return { error: 'That patient ID is already in use.' }
      }

      const patient = { id: normalizedId, displayName: normalizedName }
      setPatients((currentPatients) => [...currentPatients, patient])
      setRecoveryPlans((currentPlans) => ({
        ...currentPlans,
        [patient.id]: { ...syntheticRecoveryPlanFixture },
      }))
      setSelectedPatientId(patient.id)

      return { patient }
    },
    [patients],
  )

  const selectPatient = useCallback(
    (patientId) => {
      if (!patients.some((patient) => patient.id === patientId)) {
        return { error: 'Select an existing demo patient.' }
      }

      setSelectedPatientId(patientId)
      return { patientId }
    },
    [patients],
  )

  const addCheckIn = useCallback(
    (payload) => {
      if (!patients.some((patient) => patient.id === payload.patient_id)) {
        throw new Error('The selected demo patient no longer exists.')
      }

      checkInSequence.current += 1
      const checkIn = {
        ...payload,
        id: `check-in-${Date.now()}-${checkInSequence.current}`,
        submitted_at: new Date().toISOString(),
        data_source: 'synthetic_demo',
      }
      setCheckIns((currentCheckIns) => [checkIn, ...currentCheckIns])
      return checkIn
    },
    [patients],
  )

  const value = useMemo(
    () => ({
      patients,
      selectedPatientId,
      selectedPatient,
      recoveryPlans,
      checkIns,
      alertEvaluations: mockData.alertEvaluationsByPatientId,
      patientSummaries: mockData.patientSummariesById,
      createPatient,
      selectPatient,
      addCheckIn,
    }),
    [
      patients,
      selectedPatientId,
      selectedPatient,
      recoveryPlans,
      checkIns,
      createPatient,
      selectPatient,
      addCheckIn,
    ],
  )

  return (
    <PatientDataContext.Provider value={value}>
      {children}
    </PatientDataContext.Provider>
  )
}

export { PatientDataProvider }
