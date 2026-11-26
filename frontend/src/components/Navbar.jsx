import { Activity, HeartPulse, House, Stethoscope } from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'
import { usePatientData } from '../context/usePatientData.js'

const navigationLinks = [
  { to: '/patient', label: 'Patient Portal', Icon: Activity },
  { to: '/doctor', label: 'Doctor Dashboard', Icon: Stethoscope },
]

function Navbar() {
  const { dataMode, setDataMode } = usePatientData()

  return (
    <>
      <a
        className="sr-only z-50 rounded-lg bg-white px-4 py-3 text-navy focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:outline-2 focus:outline-teal"
        href="#main-content"
      >
        Skip to content
      </a>
      <header className="border-b border-line bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-3 sm:px-8 lg:px-12">
          <Link
            aria-label="RE:CARE AI home"
            className="flex shrink-0 items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal"
            to="/"
          >
            <span className="grid size-10 place-items-center rounded-xl bg-teal text-white shadow-sm shadow-teal/20">
              <HeartPulse aria-hidden="true" size={22} strokeWidth={2.2} />
            </span>
            <span className="text-lg font-bold tracking-tight text-navy">
              RE:<span className="text-teal">CARE</span>
              <span className="ml-1 text-xs font-semibold tracking-[0.16em] text-muted">
                AI
              </span>
            </span>
          </Link>
          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-4">
            <div className="rounded-xl border border-line bg-canvas p-1">
              <span className="sr-only" id="data-mode-label">
                Data mode: demo uses synthetic fixtures; live requests the backend.
              </span>
              <div
                aria-labelledby="data-mode-label"
                className="flex items-center gap-1"
                role="group"
              >
                {[
                  { value: 'demo', label: 'DEMO' },
                  { value: 'live', label: 'LIVE' },
                ].map(({ value, label }) => (
                  <button
                    aria-pressed={dataMode === value}
                    className={`min-h-9 rounded-lg px-3 text-xs font-bold tracking-wide transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal ${
                      dataMode === value
                        ? 'bg-teal text-white'
                        : 'text-muted hover:bg-white hover:text-navy'
                    }`}
                    key={value}
                    onClick={() => setDataMode(value)}
                    type="button"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <nav aria-label="Primary navigation" className="flex flex-wrap items-center gap-1">
            <NavLink
              className={({ isActive }) =>
                `nav-link ${isActive ? 'nav-link-active' : ''} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal`
              }
              end
              to="/"
            >
              <House aria-hidden="true" size={16} />
              <span>Home</span>
            </NavLink>
            {navigationLinks.map(({ to, label, Icon }) => (
              <NavLink
                className={({ isActive }) =>
                  `nav-link ${isActive ? 'nav-link-active' : ''} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal`
                }
                key={to}
                to={to}
              >
                <Icon aria-hidden="true" size={16} />
                <span>{label}</span>
              </NavLink>
            ))}
            </nav>
          </div>
        </div>
      </header>
    </>
  )
}

export default Navbar
