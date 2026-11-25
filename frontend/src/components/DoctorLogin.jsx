import { useState } from 'react'
import { LogIn } from 'lucide-react'
import { useDoctorAuth } from '../context/useDoctorAuth.js'

function DoctorLogin() {
  const { login } = useDoctorAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    if (loading) return
    setLoading(true)
    setError('')
    try {
      await login({ email, password })
      setPassword('')
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Doctor login failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="rounded-xl border border-line bg-canvas p-4" onSubmit={submit}>
      <p className="text-sm leading-6 text-muted">
        Sign in with the configured doctor account to use Recovery Companion.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-semibold text-navy">
          Email
          <input
            autoComplete="username"
            className="mt-1 block min-h-11 w-full rounded-lg border border-line bg-white px-3 font-normal"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
        </label>
        <label className="text-sm font-semibold text-navy">
          Password
          <input
            autoComplete="current-password"
            className="mt-1 block min-h-11 w-full rounded-lg border border-line bg-white px-3 font-normal"
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
        </label>
      </div>
      <button
        className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-full bg-teal px-4 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-60"
        disabled={loading}
        type="submit"
      >
        <LogIn aria-hidden="true" size={16} />
        {loading ? 'Signing in…' : 'Doctor login'}
      </button>
      {error ? <p className="mt-3 text-sm text-rose-800" role="alert">{error}</p> : null}
    </form>
  )
}

export default DoctorLogin
