function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function parseSymptoms(value) {
  if (Array.isArray(value)) {
    return value.filter((item) => typeof item === 'string')
  }

  if (typeof value !== 'string' || !value) {
    return []
  }

  try {
    const parsed = JSON.parse(value)
    if (Array.isArray(parsed)) {
      return parsed.filter((item) => typeof item === 'string')
    }
  } catch {
    return [value]
  }

  return [value]
}

function normalizeTemperature(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value !== 'string' || !value.trim()) {
    return null
  }

  const temperature = Number(value)
  return Number.isFinite(temperature) ? temperature : null
}

function normalizeCheckIn(record, patientId) {
  if (!isRecord(record) || !Number.isInteger(record.id)) {
    throw new Error('The patient history contains an invalid check-in record.')
  }

  const symptoms = parseSymptoms(record.symptoms)

  return {
    id: record.id,
    patient_id: patientId,
    reported_symptoms: symptoms.join('\n'),
    symptoms,
    notes: typeof record.notes === 'string' ? record.notes : null,
    pain_score:
      typeof record.pain_level === 'number' &&
      Number.isFinite(record.pain_level)
        ? record.pain_level
        : null,
    temperature_c: normalizeTemperature(record.temperature),
    submitted_at:
      typeof record.created_at === 'string' ? record.created_at : null,
    data_source: 'live',
  }
}

export function normalizeBackendPatient(value) {
  if (
    !isRecord(value) ||
    !Number.isInteger(value.id) ||
    typeof value.name !== 'string' ||
    !value.name.trim()
  ) {
    throw new Error('The patient API returned an invalid patient record.')
  }

  return {
    id: value.id,
    displayName: value.name,
    age: value.age ?? null,
    gender: value.gender ?? null,
    phone: value.phone ?? null,
    data_source: 'live',
  }
}

export function normalizeBackendPatientList(value) {
  if (!Array.isArray(value)) {
    throw new Error('The patient API response was not a patient list.')
  }

  return value.map(normalizeBackendPatient)
}

export function normalizeBackendHistory(value, expectedPatientId) {
  if (
    !isRecord(value) ||
    value.patient_id !== expectedPatientId ||
    !Array.isArray(value.history) ||
    !Number.isInteger(value.total_checkins)
  ) {
    throw new Error('The patient history API returned an invalid response.')
  }

  const history = value.history
    .map((record) => normalizeCheckIn(record, expectedPatientId))
    .map((record, index) => ({ record, index }))
    .sort((first, second) => {
      const firstTime = Date.parse(first.record.submitted_at ?? '')
      const secondTime = Date.parse(second.record.submitted_at ?? '')

      if (!Number.isFinite(firstTime) && !Number.isFinite(secondTime)) {
        return first.index - second.index
      }
      if (!Number.isFinite(firstTime)) {
        return 1
      }
      if (!Number.isFinite(secondTime)) {
        return -1
      }

      return firstTime - secondTime
    })
    .map(({ record }) => record)

  return {
    patient_id: value.patient_id,
    patient_name:
      typeof value.patient_name === 'string' ? value.patient_name : '',
    total_checkins: value.total_checkins,
    history,
  }
}
