import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import AppLayout from './components/AppLayout.jsx'
import LoadingState from './components/LoadingState.jsx'
import { PatientDataProvider } from './context/PatientDataContext.jsx'
import HomePage from './pages/HomePage.jsx'
import NotFound from './pages/NotFound.jsx'
import PatientPortal from './pages/PatientPortal.jsx'

const DoctorDashboard = lazy(() => import('./pages/DoctorDashboard.jsx'))

function App() {
  return (
    <PatientDataProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<HomePage />} />
            <Route path="patient" element={<PatientPortal />} />
            <Route
              path="doctor"
              element={
                <Suspense
                  fallback={
                    <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-12">
                      <LoadingState message="Loading doctor dashboard..." />
                    </div>
                  }
                >
                  <DoctorDashboard />
                </Suspense>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </PatientDataProvider>
  )
}

export default App
