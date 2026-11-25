import { useEffect, useRef, useState } from 'react'
import { FileText, UploadCloud, X } from 'lucide-react'
import ErrorState from './ErrorState.jsx'
import LoadingState from './LoadingState.jsx'
import { preparePdfFormData } from '../services/api.js'

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024

function formatFileSize(size) {
  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))} KB`
  }

  return `${(size / (1024 * 1024)).toFixed(2)} MB`
}

function getValidationError(file) {
  if (
    !file.name.toLowerCase().endsWith('.pdf') ||
    file.type !== 'application/pdf'
  ) {
    return 'Choose a PDF document with a .pdf extension and PDF file type.'
  }

  if (file.size === 0) {
    return 'The selected PDF is empty.'
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return 'The PDF must be 10 MB or smaller.'
  }

  return ''
}

function PDFUpload() {
  const [selectedFile, setSelectedFile] = useState(null)
  const [formData, setFormData] = useState(null)
  const [status, setStatus] = useState('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef(null)
  const prepareTimer = useRef(null)

  useEffect(
    () => () => {
      if (prepareTimer.current !== null) {
        window.clearTimeout(prepareTimer.current)
      }
    },
    [],
  )

  function handleFile(file) {
    if (prepareTimer.current !== null) {
      window.clearTimeout(prepareTimer.current)
      prepareTimer.current = null
    }

    setSelectedFile(null)
    setFormData(null)
    setErrorMessage('')
    setStatus('loading')

    prepareTimer.current = window.setTimeout(() => {
      prepareTimer.current = null
      const validationError = getValidationError(file)

      if (validationError) {
        setStatus('error')
        setErrorMessage(validationError)
        return
      }

      try {
        const preparedFormData = preparePdfFormData(file)
        setSelectedFile(file)
        setFormData(preparedFormData)
        setStatus('success')
      } catch (error) {
        setStatus('error')
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'The PDF could not be prepared for upload.',
        )
      }
    }, 120)
  }

  function handleFileSelection(event) {
    const [file] = event.target.files ?? []
    event.target.value = ''

    if (file) {
      handleFile(file)
    }
  }

  function handleDrop(event) {
    event.preventDefault()
    setIsDragging(false)

    const files = Array.from(event.dataTransfer.files)
    if (files.length > 1) {
      if (prepareTimer.current !== null) {
        window.clearTimeout(prepareTimer.current)
        prepareTimer.current = null
      }
      setSelectedFile(null)
      setFormData(null)
      setStatus('error')
      setErrorMessage('Select one PDF at a time.')
      return
    }

    if (files[0]) {
      handleFile(files[0])
    }
  }

  function removeFile() {
    if (prepareTimer.current !== null) {
      window.clearTimeout(prepareTimer.current)
      prepareTimer.current = null
    }
    setSelectedFile(null)
    setFormData(null)
    setStatus('idle')
    setErrorMessage('')
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  return (
    <section
      aria-labelledby="pdf-upload-title"
      className="rounded-2xl border border-line bg-white p-6 sm:p-7"
    >
      <div className="mb-5 flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-xl bg-teal-light text-teal-dark">
          <UploadCloud aria-hidden="true" size={21} />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Documents
          </p>
          <h2 className="mt-1 text-lg font-semibold text-navy" id="pdf-upload-title">
            Discharge PDF upload
          </h2>
        </div>
      </div>

      <div
        className={`rounded-xl border border-dashed p-6 text-center transition-colors sm:p-8 ${
          isDragging
            ? 'border-teal bg-teal-light'
            : 'border-line bg-canvas/70'
        }`}
        onDragLeave={() => setIsDragging(false)}
        onDragOver={(event) => {
          event.preventDefault()
          setIsDragging(true)
        }}
        onDrop={handleDrop}
      >
        <input
          accept=".pdf,application/pdf"
          className="peer sr-only"
          id="discharge-pdf"
          onChange={handleFileSelection}
          ref={inputRef}
          type="file"
        />
        <span className="mx-auto grid size-12 place-items-center rounded-xl bg-white text-teal-dark">
          <UploadCloud aria-hidden="true" size={23} />
        </span>
        <p className="mt-4 font-semibold text-navy">Drop a PDF here or</p>
        <label
          className="mt-1 inline-block cursor-pointer rounded font-semibold text-teal-dark underline decoration-teal/40 underline-offset-4 hover:text-teal peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-teal"
          htmlFor="discharge-pdf"
        >
          browse files
        </label>
        <p className="mt-3 text-xs text-muted">PDF only · Maximum size 10 MB</p>
      </div>

      <div className="mt-4" aria-live="polite">
        {status === 'loading' && (
          <LoadingState message="Validating PDF and preparing local upload data..." />
        )}
        {status === 'error' && (
          <ErrorState
            description={errorMessage}
            title="PDF could not be prepared"
          />
        )}
        {status === 'success' && selectedFile && formData && (
          <div className="rounded-xl border border-teal/20 bg-teal-light/60 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <FileText aria-hidden="true" className="mt-0.5 shrink-0 text-teal-dark" size={20} />
                <div className="min-w-0">
                  <p className="break-all font-semibold text-navy">
                    {selectedFile.name}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {formatFileSize(selectedFile.size)} · FormData prepared locally
                  </p>
                </div>
              </div>
              <button
                aria-label={`Remove ${selectedFile.name}`}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-navy hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
                onClick={removeFile}
                type="button"
              >
                <X aria-hidden="true" size={16} />
                Remove
              </button>
            </div>
            <p className="mt-3 text-sm leading-6 text-teal-dark" role="status">
              PDF ready for backend integration. Nothing has been uploaded or
              analyzed.
            </p>
          </div>
        )}
      </div>

      <p className="mt-4 text-xs leading-5 text-muted">
        The file stays in this browser session. AI analysis and backend upload
        are not connected.
      </p>
    </section>
  )
}

export default PDFUpload
