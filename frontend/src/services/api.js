export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

function unavailable(operation) {
  return Promise.reject(
    new Error(`${operation} API contract is not configured; no request was sent.`),
  )
}

export function preparePdfFormData(file) {
  const formData = new FormData()
  formData.set('file', file)
  return formData
}

export const apiService = Object.freeze({
  createPatient: () => unavailable('Patient creation'),
  getPatients: () => unavailable('Patient retrieval'),
  uploadPdf: () => unavailable('PDF upload'),
  getRecoveryPlan: () => unavailable('Recovery plan retrieval'),
  submitCheckIn: () => unavailable('Check-in submission'),
  getPatientHistory: () => unavailable('Patient history retrieval'),
})
