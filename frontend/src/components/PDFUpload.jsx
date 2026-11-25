import { useEffect, useRef, useState } from 'react'
import { FileText, UploadCloud, X } from 'lucide-react'
import ErrorState from './ErrorState.jsx'
import LoadingState from './LoadingState.jsx'
import { apiService, preparePdfFormData } from '../services/api.js'
import { usePatientData } from '../context/usePatientData.js'

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
  const {
    dataMode,
    selectedPatient,
    pdfUploadsByPatientId,
    rememberPdfUpload,
    rememberLiveRecoveryPlan,
  } = usePatientData()
  const [selectedFile, setSelectedFile] = useState(null)
  const [formData, setFormData] = useState(null)
  const [status, setStatus] = useState('idle')
  const [uploadStatus, setUploadStatus] = useState('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [uploadError, setUploadError] = useState('')
  const [uploadResponse, setUploadResponse] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef(null)
  const prepareTimer = useRef(null)
  const uploadController = useRef(null)
  const isUploading = useRef(false)

  const savedUpload =
    dataMode === 'live' && selectedPatient
      ? pdfUploadsByPatientId[selectedPatient.id]
      : null

  useEffect(() => () => {
    if (prepareTimer.current !== null) {
      window.clearTimeout(prepareTimer.current)
    }
    uploadController.current?.abort()
  }, [])

  function handleFile(file) {
    if (isUploading.current) {
      return
    }

    if (prepareTimer.current !== null) {
      window.clearTimeout(prepareTimer.current)
      prepareTimer.current = null
    }

    setSelectedFile(null)
    setFormData(null)
    setErrorMessage('')
    setUploadError('')
    setUploadResponse(null)
    setUploadStatus('idle')
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

    if (isUploading.current) {
      return
    }

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
    if (isUploading.current) {
      return
    }

    if (prepareTimer.current !== null) {
      window.clearTimeout(prepareTimer.current)
      prepareTimer.current = null
    }
    setSelectedFile(null)
    setFormData(null)
    setStatus('idle')
    setErrorMessage('')
    setUploadStatus('idle')
    setUploadError('')
    setUploadResponse(null)
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  async function uploadSelectedPdf() {
    if (isUploading.current || !selectedFile || !selectedPatient) {
      return
    }

    isUploading.current = true
    uploadController.current?.abort()
    const controller = new AbortController()
    uploadController.current = controller
    const patientId = selectedPatient.id
    setUploadStatus('loading')
    setUploadError('')
    setUploadResponse(null)

    try {
      const response = await apiService.uploadPdf(
        patientId,
        selectedFile,
        { signal: controller.signal },
      )

      if (controller.signal.aborted) {
        return
      }

      if (!response?.interpretation || typeof response.interpretation !== 'object') {
        throw new Error(
          'The PDF endpoint did not return a structured discharge interpretation.',
        )
      }

      if (
        response.patient_id !== undefined &&
        String(response.patient_id) !== String(patientId)
      ) {
        throw new Error('The uploaded care plan belongs to a different patient.')
      }

      const planResult = rememberLiveRecoveryPlan(
        patientId,
        response,
      )
      if (planResult.error) {
        throw new Error(planResult.error)
      }

      const savedResult = {
        care_plan_id: response.care_plan_id ?? null,
        interpretation: response.interpretation,
      }
      rememberPdfUpload(patientId, savedResult)
      setUploadResponse(savedResult)
      setUploadStatus('success')
    } catch (error) {
      if (controller.signal.aborted || error?.kind === 'aborted') {
        return
      }

      setUploadStatus('error')
      setUploadError(
        error instanceof Error
          ? error.message
          : 'The PDF could not be uploaded.',
      )
    } finally {
      isUploading.current = false
      if (uploadController.current === controller) {
        uploadController.current = null
      }
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
            {dataMode === 'demo' ? 'Documents · demo' : 'Documents · live'}
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
          disabled={uploadStatus === 'loading'}
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
                    {formatFileSize(selectedFile.size)} ·{' '}
                    {dataMode === 'demo'
                      ? 'FormData prepared locally'
                      : 'Ready to send to the live backend'}
                  </p>
                </div>
              </div>
              <button
                aria-label={`Remove ${selectedFile.name}`}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-navy hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
                disabled={uploadStatus === 'loading'}
                onClick={removeFile}
                type="button"
              >
                <X aria-hidden="true" size={16} />
                Remove
              </button>
            </div>
            {dataMode === 'demo' ? (
              <p className="mt-3 text-sm leading-6 text-teal-dark" role="status">
                PDF ready for backend integration. Nothing has been uploaded or
                analyzed.
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                <p className="text-sm leading-6 text-teal-dark">
                  Upload is associated with {selectedPatient?.displayName ?? 'no selected patient'}.
                  The backend extracts and interprets the discharge document,
                  then saves the structured plan for this patient.
                </p>
                <button
                  className="min-h-11 rounded-full bg-teal px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-dark focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal disabled:cursor-wait disabled:opacity-70"
                  disabled={!selectedPatient || uploadStatus === 'loading'}
                  onClick={uploadSelectedPdf}
                  type="button"
                >
                  {uploadStatus === 'loading'
                    ? 'Uploading PDF...'
                    : 'Upload and interpret discharge PDF'}
                </button>
                {!selectedPatient ? (
                  <p className="text-sm text-muted">
                    Select a live patient before uploading.
                  </p>
                ) : null}
                {uploadStatus === 'error' ? (
                  <ErrorState
                    description={uploadError}
                    title="PDF upload failed"
                  />
                ) : null}
                {uploadStatus === 'success' && uploadResponse ? (
                  <div
                    aria-live="polite"
                    className="rounded-xl border border-line bg-white p-4"
                    role="status"
                  >
                    <p className="font-semibold text-navy">
                      Discharge document saved and interpreted
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      Care plan record ID:{' '}
                      {uploadResponse.care_plan_id ?? 'Not returned'}.
                    </p>
                    <p className="mt-2 text-sm text-muted">
                      The structured plan is displayed below and will be
                      restored from the backend when this patient is selected.
                    </p>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        )}
      </div>

      <p className="mt-4 text-xs leading-5 text-muted">
        {dataMode === 'demo'
          ? 'The file stays in this browser session. AI analysis and backend upload are not connected.'
          : 'Live uploads send the selected file and database patient ID. Displayed details come from the saved discharge interpretation and are not a diagnosis or prescription.'}
      </p>
      {savedUpload && uploadResponse === null ? (
        <p className="mt-3 rounded-lg bg-canvas px-4 py-3 text-sm text-muted">
          Uploaded during this session — care plan record ID:{' '}
          {savedUpload.care_plan_id ?? 'Not returned'}. AI interpretation is
          available in the recovery plan above.
        </p>
      ) : null}
    </section>
  )
}

export default PDFUpload
