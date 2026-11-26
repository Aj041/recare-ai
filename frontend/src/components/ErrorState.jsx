import { CircleAlert } from 'lucide-react'

function ErrorState({
  title = 'Something went wrong',
  description = 'Please try again later.',
}) {
  return (
    <div
      aria-live="assertive"
      className="flex items-start gap-4 rounded-xl border border-rose-200 bg-rose-50 p-5 text-rose-950 shadow-sm"
      role="alert"
    >
      <CircleAlert aria-hidden="true" className="mt-0.5 shrink-0" size={21} />
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="mt-1 text-sm leading-6">{description}</p>
      </div>
    </div>
  )
}

export default ErrorState
