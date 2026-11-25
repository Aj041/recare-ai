export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').trim()

export class ApiError extends Error {
  constructor(message, { kind = 'unknown', status = null, cause } = {}) {
    super(message)
    this.name = 'ApiError'
    this.kind = kind
    this.status = status
    this.cause = cause
  }
}

function resolveApiUrl(path, baseUrl) {
  if (typeof path !== 'string' || !path.trim()) {
    throw new ApiError('An API request URL is required.', {
      kind: 'configuration',
    })
  }

  if (typeof baseUrl !== 'string' || !baseUrl.trim()) {
    throw new ApiError('VITE_API_BASE_URL is not configured.', {
      kind: 'configuration',
    })
  }

  try {
    const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
    return new URL(path, normalizedBaseUrl)
  } catch (cause) {
    throw new ApiError('The API request URL is invalid.', {
      kind: 'configuration',
      cause,
    })
  }
}

function requestFailure(error, signal) {
  if (signal?.aborted || error?.name === 'AbortError') {
    return new ApiError('The API request was cancelled.', {
      kind: 'aborted',
      cause: error,
    })
  }

  return new ApiError('The API request failed due to a network error.', {
    kind: 'network',
    cause: error,
  })
}

function formatHttpError(responseText, status) {
  try {
    const body = JSON.parse(responseText)
    const detail = body?.detail

    if (typeof detail === 'string' && detail.trim()) {
      return detail
    }

    if (Array.isArray(detail)) {
      const messages = detail
        .map((item) => {
          if (typeof item?.msg !== 'string') {
            return null
          }

          const location = Array.isArray(item.loc)
            ? item.loc.filter((part) => typeof part === 'string').join('.')
            : ''
          return location ? `${location}: ${item.msg}` : item.msg
        })
        .filter(Boolean)

      if (messages.length > 0) {
        return messages.join('; ')
      }
    }
  } catch {
    return `The API request failed with HTTP ${status}.`
  }

  return `The API request failed with HTTP ${status}.`
}

export async function requestJson(
  path,
  {
    allowEmpty = false,
    baseUrl = API_BASE_URL,
    fetchImpl = globalThis.fetch,
    ...requestOptions
  } = {},
) {
  const url = resolveApiUrl(path, baseUrl)

  if (typeof fetchImpl !== 'function') {
    throw new ApiError('Fetch is not available in this environment.', {
      kind: 'configuration',
    })
  }

  let response

  try {
    response = await fetchImpl(url, requestOptions)
  } catch (error) {
    throw requestFailure(error, requestOptions.signal)
  }

  if (!response.ok) {
    let responseText
    try {
      responseText = await response.text()
    } catch (error) {
      throw requestFailure(error, requestOptions.signal)
    }

    throw new ApiError(formatHttpError(responseText, response.status), {
      kind: 'http',
      status: response.status,
    })
  }

  let responseText

  try {
    responseText = await response.text()
  } catch (error) {
    throw requestFailure(error, requestOptions.signal)
  }

  if (!responseText.trim()) {
    if (allowEmpty) {
      return null
    }

    throw new ApiError('The API response body was empty.', {
      kind: 'empty_response',
      status: response.status,
    })
  }

  try {
    return JSON.parse(responseText)
  } catch (cause) {
    throw new ApiError('The API response was not valid JSON.', {
      kind: 'invalid_json',
      status: response.status,
      cause,
    })
  }
}

function unavailable(operation) {
  return Promise.reject(
    new ApiError(
      `${operation} API contract is not confirmed; no request was sent.`,
      { kind: 'contract_unconfirmed' },
    ),
  )
}

export function preparePdfFormData(file) {
  const formData = new FormData()
  formData.set('file', file)
  return formData
}

export const apiService = Object.freeze({
  createPatient: (patient, options = {}) =>
    requestJson('/api/patients/', {
      ...options,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: JSON.stringify(patient),
    }),
  getPatients: (options = {}) => requestJson('/api/patients/', options),
  uploadPdf: (patientId, file, options = {}) => {
    const formData = new FormData()
    formData.set('patient_id', String(patientId))
    formData.set('file', file)

    return requestJson('/api/discharge/upload', {
      ...options,
      method: 'POST',
      body: formData,
    })
  },
  getLatestCarePlan: async (patientId, options = {}) => {
    try {
      return await requestJson(
        `/api/patients/${encodeURIComponent(patientId)}/careplan/latest`,
        options,
      )
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return null
      }
      throw error
    }
  },
  submitCheckIn: (payload, options = {}) =>
    requestJson('/api/checkins', {
      ...options,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: JSON.stringify(payload),
    }),
  getRecoveryPlan: () => unavailable('Recovery plan retrieval'),
  getPatientHistory: (patientId, options = {}) =>
    requestJson(
      `/api/patients/${encodeURIComponent(patientId)}/history`,
      options,
    ),
})
