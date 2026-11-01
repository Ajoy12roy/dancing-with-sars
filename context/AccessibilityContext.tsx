'use client';

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

export type AccessibilityPriority = 'polite' | 'assertive';

export type AccessibilityEventType =
  | 'case-selected'
  | 'mode-changed'
  | 'analysis-loading'
  | 'analysis-ready'
  | 'analysis-failed'
  | 'upload-accepted'
  | 'upload-rejected'
  | 'ai-insight-loaded'
  | 'page-intro'
  | 'hint'
  | 'general';

export interface AccessibilityEvent {
  type: AccessibilityEventType;
  message: string;
  data?: Record<string, unknown>;
  priority?: AccessibilityPriority;
}

interface AccessibilityContextValue {
  announce: (message: string, priority?: AccessibilityPriority) => void;
  emitEvent: (event: AccessibilityEvent) => void;
  lastEvent: AccessibilityEvent | null;
  subscribe: (listener: (event: AccessibilityEvent) => void) => () => void;
}

const AccessibilityContext = createContext<AccessibilityContextValue | null>(null);

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [politeMessage, setPoliteMessage] = useState<string>('');
  const [assertiveMessage, setAssertiveMessage] = useState<string>('');
  const [lastEvent, setLastEvent] = useState<AccessibilityEvent | null>(null);
  
  const subscribersRef = useRef<Set<(event: AccessibilityEvent) => void>>(new Set());
  const politeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const assertiveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const announce = useCallback((message: string, priority: AccessibilityPriority = 'polite') => {
    if (!message) return;

    if (priority === 'assertive') {
      if (assertiveTimeoutRef.current) clearTimeout(assertiveTimeoutRef.current);
      setAssertiveMessage('');
      // Force DOM mutation cycle so repeated identical announcements are read
      setTimeout(() => {
        setAssertiveMessage(message);
      }, 50);
      assertiveTimeoutRef.current = setTimeout(() => {
        setAssertiveMessage('');
      }, 8000);
    } else {
      if (politeTimeoutRef.current) clearTimeout(politeTimeoutRef.current);
      setPoliteMessage('');
      setTimeout(() => {
        setPoliteMessage(message);
      }, 50);
      politeTimeoutRef.current = setTimeout(() => {
        setPoliteMessage('');
      }, 8000);
    }
  }, []);

  const emitEvent = useCallback((event: AccessibilityEvent) => {
    announce(event.message, event.priority || (event.type === 'analysis-failed' || event.type === 'upload-rejected' ? 'assertive' : 'polite'));
    setLastEvent(event);
    subscribersRef.current.forEach((listener) => {
      try {
        listener(event);
      } catch (err) {
        console.error('Accessibility listener error:', err);
      }
    });
  }, [announce]);

  const subscribe = useCallback((listener: (event: AccessibilityEvent) => void) => {
    subscribersRef.current.add(listener);
    return () => {
      subscribersRef.current.delete(listener);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (politeTimeoutRef.current) clearTimeout(politeTimeoutRef.current);
      if (assertiveTimeoutRef.current) clearTimeout(assertiveTimeoutRef.current);
    };
  }, []);

  return (
    <AccessibilityContext.Provider value={{ announce, emitEvent, lastEvent, subscribe }}>
      {children}
      {/* Visually hidden live announcer regions for assistive technologies */}
      <div
        id="a11y-live-polite"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only pointer-events-none"
      >
        {politeMessage}
      </div>
      <div
        id="a11y-live-assertive"
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only pointer-events-none"
      >
        {assertiveMessage}
      </div>
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility(): AccessibilityContextValue {
  const context = useContext(AccessibilityContext);
  if (!context) {
    // Return safe fallback if used outside provider
    return {
      announce: () => {},
      emitEvent: () => {},
      lastEvent: null,
      subscribe: () => () => {},
    };
  }
  return context;
}
