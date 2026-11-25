import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

function NotFound() {
  return (
    <section className="mx-auto flex min-h-[60vh] w-full max-w-3xl flex-col items-center justify-center px-5 py-16 text-center sm:px-8">
      <p className="text-sm font-bold uppercase tracking-[0.16em] text-teal">
        404 - Page not found
      </p>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight text-navy">
        This page is not here.
      </h1>
      <p className="mt-4 max-w-lg leading-7 text-muted">
        The address may have changed, or the page may not exist.
      </p>
      <Link
        className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-full bg-teal px-5 py-3 font-semibold text-white transition-colors hover:bg-teal-dark focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal"
        to="/"
      >
        <ArrowLeft aria-hidden="true" size={18} />
        Return home
      </Link>
    </section>
  )
}

export default NotFound
