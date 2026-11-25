function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function displayText(value) {
  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  return 'Not specified'
}

function normalizeTextList(value) {
  if (!Array.isArray(value)) {
    return []
  }

  return value.map((item) => {
    if (item === null || item === undefined) {
      return 'Not specified'
    }

    return typeof item === 'string' ||
      typeof item === 'number' ||
      typeof item === 'boolean'
      ? displayText(item)
      : 'Structured item is available but not displayed.'
  })
}

function normalizeSymptoms(value) {
  if (!Array.isArray(value)) {
    return []
  }

  return value.map((symptom) =>
    typeof symptom === 'string'
      ? symptom
      : 'Structured symptom entry is not displayed.',
  )
}

function normalizeMedication(value) {
  const medication = isRecord(value) ? value : {}

  return {
    name: displayText(medication.name),
    dose: displayText(medication.dose),
    frequency: displayText(medication.frequency),
    duration: displayText(medication.duration),
  }
}

export function normalizeRecoveryPlan(value) {
  if (!isRecord(value)) {
    return null
  }

  return {
    source: typeof value.source === 'string' ? value.source : null,
    medications: Array.isArray(value.medications)
      ? value.medications.map(normalizeMedication)
      : [],
    recovery_instructions: normalizeTextList(value.recovery_instructions),
    warning_signs: normalizeTextList(value.warning_signs),
    follow_up: normalizeTextList(value.follow_up),
    missing_information: normalizeTextList(value.missing_information),
    has_missing_information: Array.isArray(value.missing_information),
  }
}

function normalizeSupportingCheckIn(value) {
  const checkIn = isRecord(value) ? value : {}

  return {
    date: typeof checkIn.date === 'string' ? checkIn.date : null,
    pain_score:
      typeof checkIn.pain_score === 'number' &&
      Number.isFinite(checkIn.pain_score)
        ? checkIn.pain_score
        : null,
    symptoms: normalizeSymptoms(checkIn.symptoms),
  }
}

function normalizeAlert(value) {
  if (!isRecord(value)) {
    return null
  }

  return {
    alert_id: typeof value.alert_id === 'string' ? value.alert_id : null,
    alert_type: typeof value.alert_type === 'string' ? value.alert_type : null,
    rule_triggered:
      typeof value.rule_triggered === 'string' ? value.rule_triggered : null,
    explanation: typeof value.explanation === 'string' ? value.explanation : null,
    supporting_check_ins: Array.isArray(value.supporting_check_ins)
      ? value.supporting_check_ins.map(normalizeSupportingCheckIn)
      : [],
    detected_at: typeof value.detected_at === 'string' ? value.detected_at : null,
  }
}

export function normalizeAlertEvaluation(value) {
  if (
    !isRecord(value) ||
    typeof value.insufficient_history !== 'boolean' ||
    !Array.isArray(value.alerts)
  ) {
    return {
      state: 'unavailable',
      patient_id: null,
      alerts: [],
      insufficient_history_reason: null,
    }
  }

  const alerts = value.alerts.map(normalizeAlert)

  if (alerts.some((alert) => alert === null)) {
    return {
      state: 'unavailable',
      patient_id: typeof value.patient_id === 'string' ? value.patient_id : null,
      alerts: [],
      insufficient_history_reason: null,
    }
  }

  const state = value.insufficient_history
    ? 'insufficient_history'
    : alerts.length > 0
      ? 'alerts_returned'
      : 'completed_no_alerts'

  return {
    state,
    patient_id: typeof value.patient_id === 'string' ? value.patient_id : null,
    alerts,
    insufficient_history_reason:
      typeof value.insufficient_history_reason === 'string'
        ? value.insufficient_history_reason
        : null,
  }
}

export function normalizePatientSummary(value) {
  if (!isRecord(value)) {
    return null
  }

  const latestCheckIn = isRecord(value.latest_check_in)
    ? value.latest_check_in
    : null

  return {
    patient_id: typeof value.patient_id === 'string' ? value.patient_id : null,
    overview: typeof value.overview === 'string' ? value.overview : null,
    discharge: normalizeRecoveryPlan(value.discharge),
    latest_check_in: latestCheckIn
      ? {
          date:
            typeof latestCheckIn.date === 'string' ? latestCheckIn.date : null,
          pain_score:
            typeof latestCheckIn.pain_score === 'number' &&
            Number.isFinite(latestCheckIn.pain_score)
              ? latestCheckIn.pain_score
              : null,
          symptoms: normalizeSymptoms(latestCheckIn.symptoms),
        }
      : null,
    trends: value.trends,
    active_alerts: Array.isArray(value.active_alerts)
      ? value.active_alerts.map(normalizeAlert)
      : null,
    missing_information: Array.isArray(value.missing_information)
      ? normalizeTextList(value.missing_information)
      : null,
  }
}

export function describeOpaqueValue(value) {
  if (value === null || value === undefined || value === '') {
    return 'Not provided'
  }

  if (Array.isArray(value) && value.length === 0) {
    return 'Not provided'
  }

  if (isRecord(value) && Object.keys(value).length === 0) {
    return 'Not provided'
  }

  return 'Available; internal structure is not interpreted.'
}

export { displayText }
