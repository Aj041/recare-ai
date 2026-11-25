export const syntheticRecoveryPlanFixture = {
  source: 'Synthetic demo fixture',
  medicationInstructions: null,
  recoveryInstructions: null,
  warningSigns: null,
  followUpInstructions: null,
}

const demoPatientIds = ['P001', 'P002']

export const mockData = {
  patients: [
    { id: 'P001', displayName: 'Demo Patient 01' },
    { id: 'P002', displayName: 'Demo Patient 02' },
  ],
  selectedPatientId: 'P001',
  recoveryPlansByPatientId: Object.fromEntries(
    demoPatientIds.map((patientId) => [
      patientId,
      { ...syntheticRecoveryPlanFixture, patientId },
    ]),
  ),
}
