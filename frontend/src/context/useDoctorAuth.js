import { useContext } from 'react'
import DoctorAuthContext from './doctorAuthContext.js'

function useDoctorAuth() {
  const context = useContext(DoctorAuthContext)
  if (!context) {
    throw new Error('useDoctorAuth must be used within DoctorAuthProvider.')
  }
  return context
}

export { useDoctorAuth }
