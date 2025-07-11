/**
 * @fileoverview React performance optimization utilities
 * @description Provides hooks, HOCs, and utilities for optimizing React components
 */

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * Virtual scrolling hook for long lists
 */
export function useVirtualScroll<T>({
  items,
  itemHeight,
  containerHeight,
  overscan = 3
}: {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}) {
  const [scrollTop, setScrollTop] = useState(0);

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const visibleItems = items.slice(startIndex, endIndex + 1);
  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return {
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll,
    startIndex,
    endIndex
  };
}

/**
 * Intersection Observer hook for lazy loading
 */
export function useIntersectionObserver(
  options: IntersectionObserverInit = {}
) {
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);
  const observer = useRef<IntersectionObserver | null>(null);
  const elementRef = useRef<HTMLElement | null>(null);

  const setElement = useCallback((element: HTMLElement | null) => {
    if (observer.current) {
      observer.current.disconnect();
      observer.current = null;
    }

    elementRef.current = element;

    if (element) {
      observer.current = new IntersectionObserver(
        ([entry]) => setEntry(entry),
        options
      );
      observer.current.observe(element);
    }
  }, [options.root, options.rootMargin, options.threshold]);

  useEffect(() => {
    return () => {
      if (observer.current) {
        observer.current.disconnect();
      }
    };
  }, []);

  return { ref: setElement, entry, isIntersecting: entry?.isIntersecting ?? false };
}

/**
 * Lazy load component with intersection observer
 */
export function LazyLoad({ 
  children, 
  placeholder,
  rootMargin = '100px'
}: {
  children: React.ReactNode;
  placeholder?: React.ReactNode;
  rootMargin?: string;
}) {
  const { ref, isIntersecting } = useIntersectionObserver({ rootMargin });
  const hasLoaded = useRef(false);

  if (isIntersecting) {
    hasLoaded.current = true;
  }

  return (
    <div ref={ref}>
      {hasLoaded.current ? children : placeholder || <div style={{ minHeight: '100px' }} />}
    </div>
  );
}

/**
 * Debounced value hook
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

/**
 * Throttled callback hook
 */
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastRun = useRef(Date.now());
  const timeout = useRef<NodeJS.Timeout>();

  return useCallback((...args: Parameters<T>) => {
    const now = Date.now();
    
    if (now - lastRun.current >= delay) {
      lastRun.current = now;
      return callback(...args);
    }

    clearTimeout(timeout.current);
    timeout.current = setTimeout(() => {
      lastRun.current = Date.now();
      callback(...args);
    }, delay - (now - lastRun.current));
  }, [callback, delay]) as T;
}

/**
 * Optimized image component with lazy loading
 */
export const OptimizedImage = memo(({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  placeholder = 'blur',
  blurDataURL
}: {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
}) => {
  const { ref, isIntersecting } = useIntersectionObserver({
    rootMargin: '50px',
    threshold: 0.01
  });
  
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);
  const shouldLoad = priority || isIntersecting;

  return (
    <div 
      ref={ref} 
      className={className}
      style={{ 
        position: 'relative',
        width: width || '100%',
        height: height || 'auto',
        overflow: 'hidden'
      }}
    >
      {placeholder === 'blur' && blurDataURL && !isLoaded && (
        <img
          src={blurDataURL}
          alt=""
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            filter: 'blur(20px)',
            transform: 'scale(1.1)'
          }}
        />
      )}
      
      {shouldLoad && !error && (
        <img
          src={src}
          alt={alt}
          width={width}
          height={height}
          onLoad={() => setIsLoaded(true)}
          onError={() => setError(true)}
          style={{
            opacity: isLoaded ? 1 : 0,
            transition: 'opacity 0.3s'
          }}
        />
      )}
      
      {error && (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          backgroundColor: '#f3f4f6'
        }}>
          <span>Failed to load image</span>
        </div>
      )}
    </div>
  );
});

OptimizedImage.displayName = 'OptimizedImage';

/**
 * HOC for memoizing components with custom comparison
 */
export function withMemo<P extends object>(
  Component: React.ComponentType<P>,
  propsAreEqual?: (prevProps: P, nextProps: P) => boolean
) {
  return memo(Component, propsAreEqual);
}

/**
 * Performance monitoring wrapper
 */
export function withPerformanceMonitoring<P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
) {
  return (props: P) => {
    const renderStart = useRef(performance.now());
    
    useEffect(() => {
      const renderTime = performance.now() - renderStart.current;
      if (renderTime > 16) { // More than one frame (60fps)
        console.warn(`Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms`);
      }
    });

    return <Component {...props} />;
  };
}

/**
 * Batch state updates hook
 */
export function useBatchedState<T extends Record<string, any>>(
  initialState: T
): [T, (updates: Partial<T>) => void] {
  const [state, setState] = useState(initialState);
  const pendingUpdates = useRef<Partial<T>>({});
  const updateTimeout = useRef<NodeJS.Timeout>();

  const batchUpdate = useCallback((updates: Partial<T>) => {
    pendingUpdates.current = { ...pendingUpdates.current, ...updates };
    
    clearTimeout(updateTimeout.current);
    updateTimeout.current = setTimeout(() => {
      setState(current => ({ ...current, ...pendingUpdates.current }));
      pendingUpdates.current = {};
    }, 0);
  }, []);

  return [state, batchUpdate];
}

/**
 * Optimized list component with virtualization
 */
export function VirtualList<T>({
  items,
  renderItem,
  itemHeight,
  containerHeight,
  className
}: {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  itemHeight: number;
  containerHeight: number;
  className?: string;
}) {
  const {
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll,
    startIndex
  } = useVirtualScroll({ items, itemHeight, containerHeight });

  return (
    <div
      className={className}
      style={{ height: containerHeight, overflow: 'auto' }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, idx) => (
            <div key={startIndex + idx} style={{ height: itemHeight }}>
              {renderItem(item, startIndex + idx)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Export all optimization utilities
 */
export const performanceUtils = {
  useVirtualScroll,
  useIntersectionObserver,
  useDebounce,
  useThrottle,
  useBatchedState,
  withMemo,
  withPerformanceMonitoring
};