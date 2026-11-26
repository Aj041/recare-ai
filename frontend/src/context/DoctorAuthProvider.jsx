import { useCallback, useMemo, useState } from 'react'
import DoctorAuthContext from './doctorAuthContext.js'
import { apiService } from '../services/api.js'

function DoctorAuthProvider({ children }) {
  const [accessToken, setAccessToken] = useState(null)

  const login = useCallback(async (credentials) => {
    const response = await apiService.doctorLogin(credentials)
    if (
      typeof response?.access_token !== 'string' ||
      !response.access_token.trim() ||
      response.token_type?.toLowerCase() !== 'bearer'
    ) {
      throw new Error('The login response did not include a valid bearer token.')
    }
    setAccessToken(response.access_token)
    return response
  }, [])

  const logout = useCallback(() => {
    setAccessToken(null)
  }, [])

  const value = useMemo(
    () => ({ accessToken, isAuthenticated: Boolean(accessToken), login, logout }),
    [accessToken, login, logout],
  )

  return (
    <DoctorAuthContext.Provider value={value}>
      {children}
    </DoctorAuthContext.Provider>
  )
}

export { DoctorAuthProvider }
