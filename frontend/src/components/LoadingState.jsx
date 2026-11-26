import { LoaderCircle } from 'lucide-react'

function LoadingState({ message = 'Loading demo content...' }) {
  return (
    <div
      aria-live="polite"
      className="surface-panel flex items-center gap-3 rounded-xl border border-line bg-white p-6 text-muted"
      role="status"
    >
      <LoaderCircle
        aria-hidden="true"
        className="animate-spin text-teal motion-reduce:animate-none"
        size={21}
      />
      <span>{message}</span>
    </div>
  )
}

export default LoadingState
