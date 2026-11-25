function PageHeader({ eyebrow, title, description, children }) {
  return (
    <div className="flex flex-col gap-5 border-b border-line pb-7 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-3xl">
        {eyebrow && (
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-teal">
            {eyebrow}
          </p>
        )}
        <h1 className="text-3xl font-semibold tracking-tight text-navy sm:text-4xl">
          {title}
        </h1>
        {description && <p className="mt-3 leading-7 text-muted">{description}</p>}
      </div>
      {children}
    </div>
  )
}

export default PageHeader
