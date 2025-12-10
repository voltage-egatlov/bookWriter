import { useState, useCallback, useRef } from 'react'

/**
 * Custom hook for managing page-turn animations
 *
 * @param duration - Animation duration in milliseconds (default: 600ms)
 * @returns Object containing animation state and trigger function
 */
export function usePageAnimation(duration = 600) {
  const [isAnimating, setIsAnimating] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  /**
   * Triggers a page animation and executes a callback
   *
   * @param callback - Function to execute during animation (typically state update)
   */
  const triggerAnimation = useCallback((callback: () => void) => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Set animating state
    setIsAnimating(true)

    // Execute callback immediately (state change)
    callback()

    // Reset animation flag after duration
    timeoutRef.current = setTimeout(() => {
      setIsAnimating(false)
      timeoutRef.current = null
    }, duration)
  }, [duration])

  /**
   * Cancels any ongoing animation
   */
  const cancelAnimation = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    setIsAnimating(false)
  }, [])

  return {
    isAnimating,
    triggerAnimation,
    cancelAnimation
  }
}
