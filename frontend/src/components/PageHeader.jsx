function PageHeader({ eyebrow, title, description, children }) {
  return (
    <div className="flex flex-col gap-5 border-b border-line pb-7 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-3xl">
        {eyebrow && (
          <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-light px-3 py-1.5 text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-blue">
            {eyebrow}
          </p>
        )}
        <h1 className="text-3xl font-semibold tracking-tight text-navy sm:text-[2.5rem] sm:leading-tight">
          {title}
        </h1>
        {description && <p className="mt-3 max-w-2xl leading-7 text-muted">{description}</p>}
      </div>
      {children}
    </div>
  )
}

export default PageHeader
