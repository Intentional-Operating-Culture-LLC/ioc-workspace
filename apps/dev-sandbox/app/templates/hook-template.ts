/**
 * Hook Template
 * Use this as a starting point for custom React hooks
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// TypeScript types for hook parameters and return values
interface UseTemplateHookOptions {
  initialValue?: any;
  // Add your option types here
}

interface UseTemplateHookReturn {
  value: any;
  setValue: (value: any) => void;
  reset: () => void;
  // Add your return types here
}

/**
 * useTemplateHook
 * 
 * @description A template hook that demonstrates common patterns
 * @param options - Configuration options for the hook
 * @returns Hook state and methods
 * 
 * @example
 * ```tsx
 * const { value, setValue, reset } = useTemplateHook({ initialValue: 0 });
 * ```
 */
export function useTemplateHook(
  options: UseTemplateHookOptions = {}
): UseTemplateHookReturn {
  const { initialValue = null } = options;

  // State management
  const [value, setValue] = useState(initialValue);
  
  // Refs for persistent values
  const previousValueRef = useRef(initialValue);

  // Side effects
  useEffect(() => {
    // Track previous value
    previousValueRef.current = value;
  }, [value]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      // Cleanup logic
    };
  }, []);

  // Memoized callbacks
  const reset = useCallback(() => {
    setValue(initialValue);
  }, [initialValue]);

  // Return hook interface
  return {
    value,
    setValue,
    reset,
  };
}

/**
 * Example: useLocalStorage hook
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void] {
  // State to store our value
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error loading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Return a wrapped version of useState's setter function
  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      } catch (error) {
        console.error(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, storedValue]
  );

  return [storedValue, setValue];
}

/**
 * Example: useDebounce hook
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}