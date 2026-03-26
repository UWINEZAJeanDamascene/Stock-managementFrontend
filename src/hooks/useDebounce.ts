import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Debounce options
 */
export interface DebounceOptions {
  delay?: number;
  leading?: boolean;
}

/**
 * Hook for debouncing a value
 * @param value The value to debounce
 * @param delay Delay in milliseconds (default: 500)
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook for debouncing a callback function
 * @param callback The callback to debounce
 * @param delay Delay in milliseconds (default: 500)
 * @returns The debounced callback
 */
export function useDebouncedCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number = 500
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  ) as T;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
}

/**
 * Hook for debounced state - updates immediately but delays the API call
 * @param initialValue Initial state value
 * @param delay Delay in milliseconds (default: 500)
 * @returns [value, setValue, debouncedValue]
 */
export function useDebouncedState<T>(
  initialValue: T,
  delay: number = 500
): [T, React.Dispatch<React.SetStateAction<T>>, T] {
  const [value, setValue] = useState<T>(initialValue);
  const [debouncedValue, setDebouncedValue] = useState<T>(initialValue);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSetValue = useCallback((newValue: React.SetStateAction<T>) => {
    const resolvedValue = typeof newValue === 'function' 
      ? (newValue as (prev: T) => T)(value) 
      : newValue;
    
    setValue(resolvedValue);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(resolvedValue);
    }, delay);
  }, [delay, value]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return [value, handleSetValue, debouncedValue];
}

export default useDebounce;
