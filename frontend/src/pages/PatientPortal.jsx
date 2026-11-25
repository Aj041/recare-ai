import CheckInForm from '../components/CheckInForm.jsx'
import PageHeader from '../components/PageHeader.jsx'
import PatientHistory from '../components/PatientHistory.jsx'
import PatientProfile from '../components/PatientProfile.jsx'
import PDFUpload from '../components/PDFUpload.jsx'
import RecoveryPlan from '../components/RecoveryPlan.jsx'

function PatientPortal() {
  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8 sm:py-12 lg:px-12">
      <PageHeader
        description="Manage synthetic patient profiles, view a sample recovery plan, and submit demo check-ins."
        eyebrow="RE:CARE AI - Patient Portal"
        title="Your recovery space"
      >
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-teal-light px-3 py-2 text-xs font-semibold text-teal-dark">
          <span aria-hidden="true" className="size-2 rounded-full bg-teal" />
          Synthetic demo
        </span>
      </PageHeader>

      <div className="mt-7 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <PatientProfile />
        <PDFUpload />
      </div>

      <div className="mt-6">
        <RecoveryPlan />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <CheckInForm />
        <PatientHistory />
      </div>

      <p className="mt-6 text-sm leading-6 text-muted">
        Demo only: profile and check-in data stay in browser memory. No PDF is
        uploaded or analyzed, and this experience does not provide medical advice.
      </p>
    </div>
  )
}

export default PatientPortal
