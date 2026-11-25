import { useContext } from 'react'
import PatientDataContext from './patientDataContext.js'

function usePatientData() {
  const context = useContext(PatientDataContext)

  if (!context) {
    throw new Error('usePatientData must be used within PatientDataProvider.')
  }

  return context
}

export { usePatientData }
