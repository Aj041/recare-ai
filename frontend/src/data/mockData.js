export const mockData = {
  patient: {
    displayName: 'Demo Patient 01',
    demoId: 'DEMO-001',
    profileStatus: 'Sample profile',
    programLabel: 'Sample recovery workflow',
  },
  recoveryPlan: [
    {
      id: 'plan-01',
      title: 'View the shared discharge document',
      description: 'A place for the care team to share a document for review.',
      status: 'Ready',
    },
    {
      id: 'plan-02',
      title: 'Review the recovery plan',
      description: 'Plan details will be provided by the care team in a connected system.',
      status: 'In progress',
    },
    {
      id: 'plan-03',
      title: 'Complete a daily check-in',
      description: 'A simple way to share an update with the care team.',
      status: 'Not started',
    },
  ],
  dailyCheckIn: null,
  doctorDashboard: {
    patients: [
      {
        id: 'DEMO-001',
        displayName: 'Demo Patient 01',
        activity: 'Check-in recorded',
        updatedAt: 'Today',
      },
      {
        id: 'DEMO-002',
        displayName: 'Demo Patient 02',
        activity: 'Awaiting check-in',
        updatedAt: 'Yesterday',
      },
      {
        id: 'DEMO-003',
        displayName: 'Demo Patient 03',
        activity: 'Check-in recorded',
        updatedAt: 'Yesterday',
      },
    ],
    overview: [
      { label: 'Plan items in progress', value: '2 of 3' },
      { label: 'Check-ins this week', value: '5 of 7 days' },
      { label: 'Sample profile', value: 'Active' },
    ],
    latestCheckIn: {
      patient: 'Demo Patient 01',
      recordedAt: 'Today, 9:15 AM',
      description: 'Synthetic example of a check-in received.',
    },
    checkInTrend: [
      { day: 'Mon', logged: 1 },
      { day: 'Tue', logged: 0 },
      { day: 'Wed', logged: 1 },
      { day: 'Thu', logged: 1 },
      { day: 'Fri', logged: 1 },
      { day: 'Sat', logged: 0 },
      { day: 'Sun', logged: 1 },
    ],
    alerts: [
      {
        id: 'alert-01',
        title: 'No sample check-in on Tuesday',
        reason: 'The displayed demo activity series has no entry for Tuesday.',
      },
      {
        id: 'alert-02',
        title: 'One plan item is not started',
        reason: 'The sample recovery plan marks one of three items as "Not started".',
      },
    ],
    patientSummary:
      'This synthetic profile shows two plan items in progress and five sample check-ins in the displayed week. No personal or medical details are included.',
  },
}
