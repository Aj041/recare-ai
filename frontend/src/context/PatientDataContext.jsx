import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { mockData, syntheticRecoveryPlanFixture } from '../data/mockData.js'
import { apiService } from '../services/api.js'
import {
  normalizeBackendHistory,
  normalizeBackendPatient,
  normalizeBackendPatientList,
} from '../utils/backendDataAdapters.js'
import { normalizeRecoveryPlan } from '../utils/aiOutputAdapters.js'
import PatientDataContext from './patientDataContext.js'

const initialCheckInCounts = mockData.initialCheckIns.reduce(
  (counts, checkIn) => ({
    ...counts,
    [checkIn.patient_id]: (counts[checkIn.patient_id] ?? 0) + 1,
  }),
  {},
)
const EMPTY_RECORD = Object.freeze({})

function getErrorMessage(error, fallback) {
  return error instanceof Error ? error.message : fallback
}

function PatientDataProvider({ children }) {
  const [dataMode, setDataMode] = useState('demo')
  const [demoPatients, setDemoPatients] = useState(mockData.patients)
  const [selectedDemoPatientId, setSelectedDemoPatientId] = useState(
    mockData.selectedPatientId,
  )
  const [recoveryPlans, setRecoveryPlans] = useState(
    mockData.recoveryPlansByPatientId,
  )
  const [demoCheckIns, setDemoCheckIns] = useState(mockData.initialCheckIns)
  const [livePatients, setLivePatients] = useState([])
  const [selectedLivePatientId, setSelectedLivePatientId] = useState(null)
  const [livePatientsStatus, setLivePatientsStatus] = useState('idle')
  const [livePatientsError, setLivePatientsError] = useState('')
  const [liveCheckIns, setLiveCheckIns] = useState([])
  const [liveHistoryStatus, setLiveHistoryStatus] = useState('idle')
  const [liveHistoryError, setLiveHistoryError] = useState('')
  const [liveRecoveryPlans, setLiveRecoveryPlans] = useState(EMPTY_RECORD)
  const [liveRecoveryPlanStatuses, setLiveRecoveryPlanStatuses] =
    useState(EMPTY_RECORD)
  const [liveRecoveryPlanErrors, setLiveRecoveryPlanErrors] =
    useState(EMPTY_RECORD)
  const [pdfUploadsByPatientId, setPdfUploadsByPatientId] = useState({})
  const checkInSequence = useRef(0)
  const isCreatingPatient = useRef(false)
  const patientListRequest = useRef(null)
  const historyRequest = useRef(null)
  const latestCarePlanRequest = useRef(null)
  const selectedLivePatientIdRef = useRef(selectedLivePatientId)
  const dataModeRef = useRef(dataMode)

  useEffect(() => {
    selectedLivePatientIdRef.current = selectedLivePatientId
    dataModeRef.current = dataMode
  }, [dataMode, selectedLivePatientId])

  const refreshLivePatients = useCallback(async () => {
    patientListRequest.current?.abort()
    const controller = new AbortController()
    patientListRequest.current = controller
    setLivePatientsStatus('loading')
    setLivePatientsError('')

    try {
      const response = await apiService.getPatients({
        signal: controller.signal,
      })
      const normalizedPatients = normalizeBackendPatientList(response)

      if (controller.signal.aborted) {
        return { cancelled: true }
      }

      setLivePatients(normalizedPatients)
      setSelectedLivePatientId((currentPatientId) =>
        normalizedPatients.some((patient) => patient.id === currentPatientId)
          ? currentPatientId
          : normalizedPatients[0]?.id ?? null,
      )
      setLivePatientsStatus('success')
      return { patients: normalizedPatients }
    } catch (error) {
      if (controller.signal.aborted || error?.kind === 'aborted') {
        return { cancelled: true }
      }

      const message = getErrorMessage(
        error,
        'The live patient list could not be loaded.',
      )
      setLivePatientsError(message)
      setLivePatientsStatus('error')
      return { error: message }
    } finally {
      if (patientListRequest.current === controller) {
        patientListRequest.current = null
      }
    }
  }, [])

  const refreshLivePatientHistory = useCallback(async (patientId) => {
    historyRequest.current?.abort()
    const controller = new AbortController()
    historyRequest.current = controller
    setLiveCheckIns([])
    setLiveHistoryStatus('loading')
    setLiveHistoryError('')

    const requestIsCurrent = () =>
      historyRequest.current === controller &&
      dataModeRef.current === 'live' &&
      selectedLivePatientIdRef.current === patientId &&
      !controller.signal.aborted

    try {
      const response = await apiService.getPatientHistory(patientId, {
        signal: controller.signal,
      })
      const result = normalizeBackendHistory(response, patientId)

      if (!requestIsCurrent()) {
        return { cancelled: true }
      }

      setLiveCheckIns(result.history)
      setLiveHistoryStatus(result.history.length === 0 ? 'empty' : 'success')
      return { history: result.history }
    } catch (error) {
      if (
        controller.signal.aborted ||
        error?.kind === 'aborted' ||
        !requestIsCurrent()
      ) {
        return { cancelled: true }
      }

      const message = getErrorMessage(error, 'Patient history could not be loaded.')
      setLiveHistoryError(message)
      setLiveHistoryStatus('error')
      return { error: message }
    } finally {
      if (historyRequest.current === controller) {
        historyRequest.current = null
      }
    }
  }, [])

  const refreshLatestCarePlan = useCallback(async (patientId) => {
    if (patientId === null || patientId === undefined) {
      return { plan: null }
    }

    latestCarePlanRequest.current?.controller.abort()
    const controller = new AbortController()
    const request = { controller, patientId }
    latestCarePlanRequest.current = request
    setLiveRecoveryPlanStatuses((current) => ({
      ...current,
      [patientId]: 'loading',
    }))
    setLiveRecoveryPlanErrors((current) => ({ ...current, [patientId]: '' }))

    const requestIsCurrent = () =>
      latestCarePlanRequest.current === request &&
      dataModeRef.current === 'live' &&
      selectedLivePatientIdRef.current === patientId &&
      !controller.signal.aborted

    try {
      const response = await apiService.getLatestCarePlan(patientId, {
        signal: controller.signal,
      })

      if (!requestIsCurrent()) {
        return { cancelled: true }
      }

      if (response === null) {
        setLiveRecoveryPlans((current) => {
          const next = { ...current }
          delete next[patientId]
          return next
        })
        setLiveRecoveryPlanStatuses((current) => ({
          ...current,
          [patientId]: 'empty',
        }))
        return { plan: null }
      }

      if (
        response?.patient_id !== undefined &&
        String(response.patient_id) !== String(patientId)
      ) {
        throw new Error('The latest care plan belongs to a different patient.')
      }

      const plan = normalizeRecoveryPlan(response)
      if (!plan) {
        throw new Error('The latest care plan response did not contain a structured plan.')
      }

      setLiveRecoveryPlans((current) => ({ ...current, [patientId]: plan }))
      setLiveRecoveryPlanStatuses((current) => ({
        ...current,
        [patientId]: 'success',
      }))
      return { plan }
    } catch (error) {
      if (
        controller.signal.aborted ||
        error?.kind === 'aborted' ||
        !requestIsCurrent()
      ) {
        return { cancelled: true }
      }

      const message = getErrorMessage(
        error,
        'The latest recovery plan could not be loaded.',
      )
      setLiveRecoveryPlanErrors((current) => ({
        ...current,
        [patientId]: message,
      }))
      setLiveRecoveryPlanStatuses((current) => ({
        ...current,
        [patientId]: 'error',
      }))
      return { error: message }
    } finally {
      if (latestCarePlanRequest.current === request) {
        latestCarePlanRequest.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (dataMode !== 'live') {
      patientListRequest.current?.abort()
      historyRequest.current?.abort()
      latestCarePlanRequest.current?.controller.abort()
      return undefined
    }

    let cancelled = false
    Promise.resolve().then(() => {
      if (!cancelled) {
        refreshLivePatients()
      }
    })
    return () => {
      cancelled = true
      patientListRequest.current?.abort()
      historyRequest.current?.abort()
      latestCarePlanRequest.current?.controller.abort()
    }
  }, [dataMode, refreshLivePatients])

  useEffect(() => {
    if (dataMode !== 'live' || selectedLivePatientId === null) {
      latestCarePlanRequest.current?.controller.abort()
      return undefined
    }

    const requestedPatientId = selectedLivePatientId
    let cancelled = false
    Promise.resolve().then(() => {
      if (!cancelled) {
        refreshLatestCarePlan(requestedPatientId)
      }
    })
    return () => {
      cancelled = true
      if (latestCarePlanRequest.current?.patientId === requestedPatientId) {
        latestCarePlanRequest.current.controller.abort()
      }
    }
  }, [dataMode, selectedLivePatientId, refreshLatestCarePlan])

  useEffect(() => {
    if (dataMode !== 'live') {
      historyRequest.current?.abort()
      return undefined
    }

    if (selectedLivePatientId === null) {
      Promise.resolve().then(() => {
        if (
          dataModeRef.current === 'live' &&
          selectedLivePatientIdRef.current === null
        ) {
          setLiveCheckIns([])
          setLiveHistoryStatus('empty')
          setLiveHistoryError('')
        }
      })
      return undefined
    }

    const requestedPatientId = selectedLivePatientId
    let cancelled = false
    Promise.resolve().then(() => {
      if (!cancelled) {
        refreshLivePatientHistory(requestedPatientId)
      }
    })

    return () => {
      cancelled = true
      historyRequest.current?.abort()
    }
  }, [dataMode, selectedLivePatientId, refreshLivePatientHistory])

  const selectedPatientId =
    dataMode === 'demo' ? selectedDemoPatientId : selectedLivePatientId
  const patients = dataMode === 'demo' ? demoPatients : livePatients
  const selectedPatient =
    patients.find((patient) => patient.id === selectedPatientId) ?? null
  const checkIns = dataMode === 'demo' ? demoCheckIns : liveCheckIns
  const activeRecoveryPlans =
    dataMode === 'demo' ? recoveryPlans : liveRecoveryPlans
  const recoveryPlanStatus =
    dataMode === 'demo'
      ? selectedPatient
        ? 'success'
        : 'empty'
      : selectedPatientId === null
        ? 'idle'
        : liveRecoveryPlanStatuses[selectedPatientId] ?? 'idle'
  const recoveryPlanError =
    dataMode === 'live' && selectedPatientId !== null
      ? liveRecoveryPlanErrors[selectedPatientId] ?? ''
      : ''
  const alertEvaluations =
    dataMode === 'demo' ? mockData.alertEvaluationsByPatientId : EMPTY_RECORD
  const patientSummaries =
    dataMode === 'demo' ? mockData.patientSummariesById : EMPTY_RECORD
  const patientListStatus =
    dataMode === 'demo' ? 'success' : livePatientsStatus
  const patientListError = dataMode === 'demo' ? '' : livePatientsError
  const patientHistoryStatus =
    dataMode === 'demo'
      ? selectedPatient
        ? 'success'
        : 'empty'
      : liveHistoryStatus
  const patientHistoryError = dataMode === 'demo' ? '' : liveHistoryError

  const createPatient = useCallback(
    async ({ displayName, id, age, gender, phone }) => {
      const normalizedName = displayName.trim()

      if (!normalizedName) {
        return { error: 'Patient name is required.' }
      }

      if (dataMode === 'live') {
        if (isCreatingPatient.current) {
          return { error: 'Patient creation is already in progress.' }
        }

        const parsedAge =
          age === undefined || age === null || age === ''
            ? undefined
            : Number(age)
        if (
          parsedAge !== undefined &&
          (!Number.isInteger(parsedAge) || parsedAge < 0)
        ) {
          return { error: 'Age must be a non-negative whole number.' }
        }

        isCreatingPatient.current = true
        try {
          const createdResponse = await apiService.createPatient({
            name: normalizedName,
            ...(parsedAge === undefined ? {} : { age: parsedAge }),
            ...(gender?.trim() ? { gender: gender.trim() } : {}),
            ...(phone?.trim() ? { phone: phone.trim() } : {}),
          })
          const patient = normalizeBackendPatient(createdResponse)

          setLivePatients((currentPatients) =>
            currentPatients.some((item) => item.id === patient.id)
              ? currentPatients
              : [...currentPatients, patient],
          )
          setSelectedLivePatientId(patient.id)

          const refreshResult = await refreshLivePatients()
          return {
            patient,
            ...(refreshResult.error
              ? { refreshError: refreshResult.error }
              : {}),
          }
        } catch (error) {
          return {
            error: getErrorMessage(
              error,
              'The live patient could not be created.',
            ),
          }
        } finally {
          isCreatingPatient.current = false
        }
      }

      const normalizedId = typeof id === 'string' ? id.trim().toUpperCase() : ''
      if (!normalizedId) {
        return { error: 'Patient name and ID are required.' }
      }

      if (
        demoPatients.some(
          (patient) => patient.id.toLowerCase() === normalizedId.toLowerCase(),
        )
      ) {
        return { error: 'That patient ID is already in use.' }
      }

      const patient = { id: normalizedId, displayName: normalizedName }
      setDemoPatients((currentPatients) => [...currentPatients, patient])
      setRecoveryPlans((currentPlans) => ({
        ...currentPlans,
        [patient.id]: { ...syntheticRecoveryPlanFixture },
      }))
      setSelectedDemoPatientId(patient.id)

      return { patient }
    },
    [dataMode, demoPatients, refreshLivePatients],
  )

  const selectPatient = useCallback(
    (patientId) => {
      if (dataMode === 'live') {
        const normalizedId =
          typeof patientId === 'string' && /^\d+$/.test(patientId)
            ? Number(patientId)
            : patientId

        if (
          !Number.isInteger(normalizedId) ||
          !livePatients.some((patient) => patient.id === normalizedId)
        ) {
          return { error: 'Select an existing live patient.' }
        }

        setSelectedLivePatientId(normalizedId)
        return { patientId: normalizedId }
      }

      if (!demoPatients.some((patient) => patient.id === patientId)) {
        return { error: 'Select an existing demo patient.' }
      }

      setSelectedDemoPatientId(patientId)
      return { patientId }
    },
    [dataMode, demoPatients, livePatients],
  )

  const addCheckIn = useCallback(
    async (payload) => {
      if (dataMode === 'live') {
        if (
          !Number.isInteger(payload.patient_id) ||
          !livePatients.some((patient) => patient.id === payload.patient_id)
        ) {
          throw new Error('Select an existing live patient before submitting a check-in.')
        }

        const response = await apiService.submitCheckIn(payload)
        if (
          response?.patient_id !== undefined &&
          Number(response.patient_id) !== payload.patient_id
        ) {
          throw new Error('The saved check-in belongs to a different patient.')
        }

        let historyRefreshError = ''
        if (
          dataModeRef.current === 'live' &&
          selectedLivePatientIdRef.current === payload.patient_id
        ) {
          const refreshResult = await refreshLivePatientHistory(payload.patient_id)
          historyRefreshError = refreshResult.error ?? ''
        }

        return { ...response, historyRefreshError }
      }

      if (!demoPatients.some((patient) => patient.id === payload.patient_id)) {
        throw new Error('The selected demo patient no longer exists.')
      }

      checkInSequence.current += 1
      const checkIn = {
        ...payload,
        id: `check-in-${Date.now()}-${checkInSequence.current}`,
        submitted_at: new Date().toISOString(),
        data_source: 'synthetic_demo',
      }
      setDemoCheckIns((currentCheckIns) => [checkIn, ...currentCheckIns])
      return checkIn
    },
    [dataMode, demoPatients, livePatients, refreshLivePatientHistory],
  )

  const rememberPdfUpload = useCallback((patientId, upload) => {
    setPdfUploadsByPatientId((currentUploads) => ({
      ...currentUploads,
      [patientId]: upload,
    }))
  }, [])

  const rememberLiveRecoveryPlan = useCallback((patientId, planData) => {
    if (
      dataModeRef.current !== 'live' ||
      selectedLivePatientIdRef.current !== patientId
    ) {
      return { error: 'The selected patient changed before the plan was saved.' }
    }

    const plan = normalizeRecoveryPlan(planData)
    if (!plan) {
      return { error: 'The upload response did not contain a structured recovery plan.' }
    }

    if (latestCarePlanRequest.current?.patientId === patientId) {
      latestCarePlanRequest.current.controller.abort()
    }
    setLiveRecoveryPlans((current) => ({ ...current, [patientId]: plan }))
    setLiveRecoveryPlanStatuses((current) => ({
      ...current,
      [patientId]: 'success',
    }))
    setLiveRecoveryPlanErrors((current) => ({ ...current, [patientId]: '' }))
    return { plan }
  }, [])

  const hasPatientHistoryChanged = useCallback(
    (patientId) =>
      dataMode === 'demo' &&
      demoCheckIns.filter((checkIn) => checkIn.patient_id === patientId)
        .length !== (initialCheckInCounts[patientId] ?? 0),
    [dataMode, demoCheckIns],
  )

  const value = useMemo(
    () => ({
      dataMode,
      setDataMode,
      patients,
      selectedPatientId,
      selectedPatient,
      recoveryPlans: activeRecoveryPlans,
      recoveryPlanStatus,
      recoveryPlanError,
      checkIns,
      alertEvaluations,
      patientSummaries,
      patientListStatus,
      patientListError,
      patientHistoryStatus,
      patientHistoryError,
      pdfUploadsByPatientId,
      refreshLivePatients,
      refreshLatestCarePlan,
      rememberPdfUpload,
      rememberLiveRecoveryPlan,
      createPatient,
      selectPatient,
      addCheckIn,
      hasPatientHistoryChanged,
    }),
    [
      dataMode,
      patients,
      selectedPatientId,
      selectedPatient,
      activeRecoveryPlans,
      recoveryPlanStatus,
      recoveryPlanError,
      checkIns,
      alertEvaluations,
      patientSummaries,
      patientListStatus,
      patientListError,
      patientHistoryStatus,
      patientHistoryError,
      pdfUploadsByPatientId,
      refreshLivePatients,
      refreshLatestCarePlan,
      rememberPdfUpload,
      rememberLiveRecoveryPlan,
      createPatient,
      selectPatient,
      addCheckIn,
      hasPatientHistoryChanged,
    ],
  )

  return (
    <PatientDataContext.Provider value={value}>
      {children}
    </PatientDataContext.Provider>
  )
}

export { PatientDataProvider }
