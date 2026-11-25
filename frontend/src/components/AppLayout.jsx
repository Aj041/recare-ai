import { Outlet } from 'react-router-dom'
import Navbar from './Navbar.jsx'

function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-canvas text-navy">
      <Navbar />
      <main className="w-full flex-1" id="main-content">
        <Outlet />
      </main>
      <footer className="border-t border-line bg-white">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-1 px-5 py-5 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
          <span className="font-semibold text-navy">RE:CARE AI</span>
          <span>Synthetic demo experience - no real patient data.</span>
        </div>
      </footer>
    </div>
  )
}

export default AppLayout
