/**
 * Security helper functions for the memory store
 * Handles secure error messages and prevents information disclosure
 */

// Secure error handling that prevents information disclosure
export const createSecureError = (
  operation: string,
  originalError?: unknown
): Error => {
  // Log detailed error information server-side only (if available)
  if (process.server && originalError) {
    console.error(`Store operation failed: ${operation}`, originalError)
  }

  // Return generic client-side error message
  return new Error(`${operation} failed. Please try again.`)
}

// Network error detection helper
export const isNetworkError = (error: any): boolean => {
  return (
    error?.name === "FetchError" ||
    error?.code === "NETWORK_ERROR" ||
    error?.message?.includes("fetch") ||
    error?.message?.includes("network")
  )
}

// Check if error is retryable (for simple retry logic)
export const isRetryableError = (error: any): boolean => {
  // Network errors are retryable
  if (isNetworkError(error)) {
    return true
  }

  // Temporary server errors are retryable
  if (error?.status >= 500 && error?.status < 600) {
    return true
  }

  // Rate limit errors might be retryable after delay
  if (error?.status === 429) {
    return true
  }

  return false
}

// Create user-friendly error messages based on HTTP status codes
export const getUserFriendlyErrorMessage = (
  operation: string,
  error: any
): string => {
  if (isNetworkError(error)) {
    return `${operation} failed due to network issues. Please check your connection and try again.`
  }

  switch (error?.status) {
    case 400:
      return `${operation} failed due to invalid data. Please check your input and try again.`
    case 401:
      return `${operation} failed. Please log in and try again.`
    case 403:
      return `${operation} failed. You don't have permission to perform this action.`
    case 404:
      return `${operation} failed. The requested item was not found.`
    case 409:
      return `${operation} failed due to a conflict. The item may have been modified by another user.`
    case 429:
      return `${operation} failed. Too many requests. Please wait a moment and try again.`
    case 500:
    case 502:
    case 503:
    case 504:
      return `${operation} failed due to a server error. Please try again later.`
    default:
      return `${operation} failed. Please try again.`
  }
}

// Simple retry wrapper for API calls
export const withRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries = 1,
  delayMs = 1000
): Promise<T> => {
  let lastError: any

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error

      // Don't retry if error is not retryable or this is the last attempt
      if (!isRetryableError(error) || attempt === maxRetries) {
        throw error
      }

      // Wait before retrying
      await new Promise((resolve) =>
        setTimeout(resolve, delayMs * Math.pow(2, attempt))
      )
    }
  }

  throw lastError
}
