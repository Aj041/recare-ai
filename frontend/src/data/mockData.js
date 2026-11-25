export const syntheticRecoveryPlanFixture = {
  medications: [
    {
      name: 'Example medication',
      dose: 'Not specified',
      frequency: 'Not specified',
      duration: 'Not specified',
    },
  ],
  recovery_instructions: [],
  warning_signs: [],
  follow_up: [],
  missing_information: [
    'No medication dose, frequency, duration, or recovery instructions are provided in this fixture.',
  ],
}

const emptyRecoveryPlanFixture = {
  medications: [],
  recovery_instructions: [],
  warning_signs: [],
  follow_up: [],
  missing_information: [
    'Recovery-plan details are not included in this demo fixture.',
  ],
}

const emptyPlanFixture = {
  medications: [],
  recovery_instructions: [],
  warning_signs: [],
  follow_up: [],
  missing_information: [],
}

const painTrendAlertFixture = {
  alert_id: 'demo-alert-fixture-p001',
  alert_type: 'pain_trend',
  rule_triggered: 'Configured demo rule description',
  explanation: 'Reported pain score increased across recent check-ins',
  supporting_check_ins: [
    { date: '2026-11-21', pain_score: 1, symptoms: [] },
    { date: '2026-11-22', pain_score: 1, symptoms: [] },
    { date: '2026-11-23', pain_score: 2, symptoms: [] },
  ],
  detected_at: '2026-11-25T08:30:00Z',
}

const patientSummaryFixture = {
  patient_id: 'P001',
  overview: '',
  discharge: {
    medications: syntheticRecoveryPlanFixture.medications,
    recovery_instructions: syntheticRecoveryPlanFixture.recovery_instructions,
    warning_signs: syntheticRecoveryPlanFixture.warning_signs,
    follow_up: syntheticRecoveryPlanFixture.follow_up,
  },
  latest_check_in: {
    date: '2026-11-23',
    pain_score: 2,
    symptoms: [],
  },
  trends: {},
  active_alerts: [painTrendAlertFixture],
  missing_information: syntheticRecoveryPlanFixture.missing_information,
}

function createCheckIn({
  id,
  patientId,
  submittedAt,
  painScore = null,
}) {
  return {
    id,
    patient_id: patientId,
    reported_symptoms: '',
    pain_score: painScore,
    medication_taken: null,
    temperature_c: null,
    submitted_at: submittedAt,
    data_source: 'synthetic_demo',
    symptoms: [],
  }
}

export const mockData = {
  patients: [
    { id: 'P001', displayName: 'Demo Patient 01' },
    { id: 'P002', displayName: 'Demo Patient 02' },
    { id: 'P003', displayName: 'Demo Patient 03' },
  ],
  selectedPatientId: 'P001',
  initialCheckIns: [
    createCheckIn({
      id: 'C001',
      patientId: 'P001',
      submittedAt: '2026-11-21T09:00:00Z',
      painScore: 1,
    }),
    createCheckIn({
      id: 'C002',
      patientId: 'P001',
      submittedAt: '2026-11-22T09:00:00Z',
      painScore: 1,
    }),
    createCheckIn({
      id: 'C003',
      patientId: 'P001',
      submittedAt: '2026-11-23T09:00:00Z',
      painScore: 2,
    }),
    createCheckIn({
      id: 'C004',
      patientId: 'P003',
      submittedAt: '2026-11-24T09:00:00Z',
    }),
    createCheckIn({
      id: 'C005',
      patientId: 'P003',
      submittedAt: '2026-11-25T09:00:00Z',
    }),
  ],
  recoveryPlansByPatientId: {
    P001: syntheticRecoveryPlanFixture,
    P002: emptyRecoveryPlanFixture,
    P003: emptyPlanFixture,
  },
  alertEvaluationsByPatientId: {
    P001: {
      patient_id: 'P001',
      alerts: [painTrendAlertFixture],
      insufficient_history: false,
      insufficient_history_reason: null,
    },
    P002: {
      patient_id: 'P002',
      alerts: [],
      insufficient_history: true,
      insufficient_history_reason:
        'Synthetic fixture: no check-in history is available for evaluation.',
    },
    P003: {
      patient_id: 'P003',
      alerts: [],
      insufficient_history: false,
      insufficient_history_reason: null,
    },
  },
  patientSummariesById: {
    P001: patientSummaryFixture,
    P002: {
      patient_id: 'P002',
      overview: '',
      discharge: emptyRecoveryPlanFixture,
      latest_check_in: null,
      trends: {},
      active_alerts: [],
      missing_information: [],
    },
    P003: {
      patient_id: 'P003',
      overview: '',
      discharge: emptyPlanFixture,
      latest_check_in: {
        date: '2026-11-25',
        pain_score: null,
        symptoms: [],
      },
      trends: {},
      active_alerts: [],
      missing_information: [],
    },
  },
}
