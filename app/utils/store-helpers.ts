import { computed, type ComputedRef } from 'vue'
import { toValue } from '@vueuse/core'

/**
 * Creates a safe computed property that handles readonly refs without triggering warnings
 * This is useful when working with Pinia stores that return readonly refs
 */
export function safeComputed<T>(getter: () => T): ComputedRef<T> {
  return computed(() => {
    // Use toValue to safely unwrap any refs
    const value = getter()
    // If it's an array, create a shallow copy to avoid readonly warnings
    if (Array.isArray(value)) {
      return [...value] as T
    }
    // For objects, we might need to create a shallow copy as well
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return { ...value } as T
    }
    return value
  })
}

/**
 * Safely accesses a property from a potentially readonly object
 */
export function safeAccess<T, K extends keyof T>(
  obj: T,
  key: K
): T[K] | undefined {
  try {
    return toValue(obj)?.[key]
  } catch {
    return undefined
  }
}