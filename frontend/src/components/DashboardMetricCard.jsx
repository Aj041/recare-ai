function DashboardMetricCard({ icon: Icon, label, value, description }) {
  return (
    <article
      aria-label={`${label}: ${value}`}
      className="rounded-2xl border border-line bg-white p-5 sm:p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium leading-5 text-muted">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-navy">
            {value}
          </p>
        </div>
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-teal-light text-teal-dark">
          <Icon aria-hidden="true" size={21} />
        </span>
      </div>
      {description && (
        <p className="mt-3 text-xs leading-5 text-muted">{description}</p>
      )}
    </article>
  )
}

export default DashboardMetricCard
