import { FileText } from 'lucide-react'

function EmptyState({
  icon: Icon = FileText,
  title,
  description,
  children,
}) {
  return (
    <div
      className="flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-line bg-white/70 px-5 py-8 text-center"
      role="status"
    >
      <span className="grid size-11 place-items-center rounded-xl bg-blue-light text-blue">
        <Icon aria-hidden="true" size={21} />
      </span>
      <h3 className="mt-4 font-semibold text-navy">{title}</h3>
      {description && (
        <p className="mt-2 max-w-md text-sm leading-6 text-muted">{description}</p>
      )}
      {children}
    </div>
  )
}

export default EmptyState
