'use client';

import { useState, useEffect, useRef, useCallback, useSyncExternalStore } from 'react';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Volume2, VolumeX, Minimize2, Maximize2, Sparkles, Square } from 'lucide-react';
import { useAccessibility, type AccessibilityEvent } from '@/context';
import {
  buildChikuScript,
  formatRangeString,
  buildAnalysisNarrationParts,
  buildReliabilityNotesLines,
  PAGE_INTROS,
  type ChikuContextData,
} from '@/lib/chiku-script';
import { type SensitivityData } from '@/lib/sensitivity';
import {
  ChikuSpeechQueue,
  type ChikuEventGroup,
  type ChikuPriority,
  type SpeechAdapter,
  type SpeechAdapterHandlers,
  type SpeechDecisionLog,
} from '@/lib/chiku-speech-queue';

export const CHIKU_WELCOME_TEXT =
  "Welcome to Terra Pulse! I'm Chiku, your guide to seeing Earth change through radar.";
export const CHIKU_TEST_VOICE_TEXT = 'Chiku voice test.';

export const CHIKU_SPEECH_RATE = 0.95;
export const CHIKU_SPEECH_PITCH = 1.05;

interface ChikuGuideProps {
  contextData?: ChikuContextData;
  className?: string;
}

type ChikuSprite =
  | 'idle'
  | 'blink'
  | 'look-left'
  | 'look-right'
  | 'talk-1'
  | 'talk-2'
  | 'happy';

const SPRITE_PATHS: Record<ChikuSprite, string> = {
  idle: '/chiku/chiku-idle.png',
  blink: '/chiku/chiku-blink.png',
  'look-left': '/chiku/chiku-look-left.png',
  'look-right': '/chiku/chiku-look-right.png',
  'talk-1': '/chiku/chiku-talk-1.png',
  'talk-2': '/chiku/chiku-talk-2.png',
  happy: '/chiku/chiku-happy.png',
};

const ALL_SPRITES: ChikuSprite[] = [
  'idle',
  'blink',
  'look-left',
  'look-right',
  'talk-1',
  'talk-2',
  'happy',
];

// Safe client-mount detection satisfying React 19 hydration rules without setState in effect
const emptySubscribe = () => () => {};
function useIsClientMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

function subscribeToReducedMotion(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  mq.addEventListener('change', callback);
  return () => mq.removeEventListener('change', callback);
}

function getReducedMotionSnapshot(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function getServerReducedMotionSnapshot(): boolean {
  return false;
}

function isChikuDebug(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem('chikuDebug') === '1';
  } catch {
    return false;
  }
}

export interface ChikuDebugEvent {
  id: string;
  time: string;
  key: string;
  priority: number;
  outcome: string;
  voice: string;
  synthState: string;
}

function selectBestVoice(
  voices: SpeechSynthesisVoice[],
  excludeVoice?: SpeechSynthesisVoice | null
): SpeechSynthesisVoice | null {
  if (!voices || voices.length === 0) return null;

  const candidatePool = excludeVoice
    ? voices.filter((v) => v.voiceURI !== excludeVoice.voiceURI && v.name !== excludeVoice.name)
    : voices;
  const pool = candidatePool.length > 0 ? candidatePool : voices;

  // 1. English voice (lang starts with en) with localService === true
  const localEn = pool.find((v) => v.lang.toLowerCase().startsWith('en') && v.localService === true);
  if (localEn) return localEn;

  // 2. Any English voice not named "Online" or "Natural" when offline (or preferred in general)
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  if (!isOnline) {
    const offlineEn = pool.find(
      (v) =>
        v.lang.toLowerCase().startsWith('en') &&
        !v.name.includes('Online') &&
        !v.name.includes('Natural')
    );
    if (offlineEn) return offlineEn;
  } else {
    const nonOnlineEn = pool.find(
      (v) =>
        v.lang.toLowerCase().startsWith('en') &&
        !v.name.includes('Online') &&
        !v.name.includes('Natural')
    );
    if (nonOnlineEn) return nonOnlineEn;
  }

  // 3. Any English voice
  const anyEn = pool.find((v) => v.lang.toLowerCase().startsWith('en'));
  if (anyEn) return anyEn;

  // 4. Default voice or first in pool
  const defaultVoice = pool.find((v) => v.default);
  if (defaultVoice) return defaultVoice;

  return pool[0] || null;
}

function getEventGroup(eventType: string): ChikuEventGroup {
  switch (eventType) {
    case 'mode-changed':
    case 'case-selected':
    case 'welcome':
    case 'test-voice':
    case 'explain-view':
      return 'view';
    case 'processing':
    case 'analysis-loading':
    case 'analysis-ready':
    case 'analysis-failed':
      return 'analysis';
    case 'upload-accepted':
    case 'upload-rejected':
      return 'upload';
    case 'ai-insight-loaded':
    case 'ai-interpretation':
      return 'ai';
    case 'page-intro':
      return 'page';
    case 'hint':
      return 'hint';
    case 'notes':
      return 'notes';
    default:
      return 'view';
  }
}

function getEventPriority(eventType: string): ChikuPriority {
  switch (eventType) {
    case 'welcome':
    case 'test-voice':
    case 'explain-view':
    case 'analysis-ready':
    case 'analysis-failed':
    case 'upload-rejected':
      return 3;
    case 'mode-changed':
    case 'case-selected':
    case 'upload-accepted':
    case 'page-intro':
      return 2;
    case 'hint':
    case 'ai-insight-loaded':
    case 'ai-interpretation':
    case 'processing':
    case 'analysis-loading':
    case 'notes':
    default:
      return 1;
  }
}

export function ChikuGuide({ contextData, className = '' }: ChikuGuideProps) {
  const pathname = usePathname();
  const { subscribe } = useAccessibility();
  const isMounted = useIsClientMounted();

  // User-explicit overrides for voice and minimized state
  const [userVoiceEnabled, setUserVoiceEnabled] = useState<boolean | null>(null);
  const [userMinimized, setUserMinimized] = useState<boolean | null>(null);
  const [userNarrationDetail, setUserNarrationDetail] = useState<'full' | 'short' | null>(null);

  // Derived state: strictly false during SSR and initial hydration; reads storage post-mount
  const isVoiceEnabled = isMounted
    ? userVoiceEnabled !== null
      ? userVoiceEnabled
      : (() => {
          try {
            return localStorage.getItem('terrapulse-chiku-voice') === 'on';
          } catch {
            return false;
          }
        })()
    : false;

  const isMinimized = isMounted
    ? userMinimized !== null
      ? userMinimized
      : (() => {
          try {
            return localStorage.getItem('terrapulse-chiku-minimized') === 'true';
          } catch {
            return false;
          }
        })()
    : false;

  const narrationDetail: 'full' | 'short' = isMounted
    ? userNarrationDetail !== null
      ? userNarrationDetail
      : (() => {
          try {
            const saved = localStorage.getItem('terrapulse-chiku-narration');
            return saved === 'short' ? 'short' : 'full';
          } catch {
            return 'full';
          }
        })()
    : 'full';

  const hasSpeechSupport = isMounted && typeof window !== 'undefined' && 'speechSynthesis' in window;

  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceStatusOverride, setVoiceStatusOverride] = useState<string | null>(null);
  const [debugEvents, setDebugEvents] = useState<ChikuDebugEvent[]>([]);
  const [currentText, setCurrentText] = useState<string>(
    'Hi! I am Chiku, your guide to seeing Earth change through radar. Select any case study to begin exploration.'
  );

  const isDebug = isMounted && isChikuDebug();

  const recordDebugEvent = useCallback(
    (
      key: string,
      priority: number,
      outcome: string,
      voiceName: string,
      synthState?: { speaking: boolean; pending: boolean; paused: boolean }
    ) => {
      if (!isChikuDebug()) return;
      const now = new Date();
      const timeStr =
        now.toTimeString().substring(0, 8) + '.' + String(now.getMilliseconds()).padStart(3, '0');
      const stateStr = synthState
        ? `spk:${synthState.speaking ? 1 : 0} pnd:${synthState.pending ? 1 : 0} psd:${synthState.paused ? 1 : 0}`
        : typeof window !== 'undefined' && 'speechSynthesis' in window
        ? `spk:${window.speechSynthesis.speaking ? 1 : 0} pnd:${window.speechSynthesis.pending ? 1 : 0} psd:${window.speechSynthesis.paused ? 1 : 0}`
        : 'no-synth';

      setDebugEvents((prev) => {
        const next = [
          ...prev,
          {
            id: Math.random().toString(36).substring(2, 9),
            time: timeStr,
            key,
            priority,
            outcome,
            voice: voiceName,
            synthState: stateStr,
          },
        ];
        return next.slice(-12);
      });
    },
    []
  );

  // Derived visible voice status
  const voiceStatus = !isVoiceEnabled
    ? 'Voice off'
    : voiceStatusOverride
    ? voiceStatusOverride
    : isSpeaking
    ? 'Speaking...'
    : (() => {
        const best = selectBestVoice(availableVoices);
        return best ? `Voice ready (${best.name})` : 'Voice ready (Default)';
      })();

  // Sprite animation state
  const [currentSprite, setCurrentSprite] = useState<ChikuSprite>('idle');
  const prefersReducedMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    getServerReducedMotionSnapshot
  );

  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const queueRef = useRef<ChikuSpeechQueue | null>(null);
  const isVoiceEnabledRef = useRef<boolean>(isVoiceEnabled);
  const availableVoicesRef = useRef<SpeechSynthesisVoice[]>(availableVoices);
  const hasSpokenWelcomeRef = useRef<boolean>(false);

  const narrationDetailRef = useRef<'full' | 'short'>('full');

  useEffect(() => {
    narrationDetailRef.current = narrationDetail;
  }, [narrationDetail]);

  const handleToggleNarrationDetail = (val: 'full' | 'short') => {
    setUserNarrationDetail(val);
    narrationDetailRef.current = val;
    try {
      localStorage.setItem('terrapulse-chiku-narration', val);
    } catch {}
  };

  const cachedContextRef = useRef<ChikuContextData>(contextData || {});
  const spokenPagesRef = useRef<Set<string>>(new Set());
  const spokenHintsRef = useRef<Set<string>>(new Set());
  const userHasInteractedRef = useRef<boolean>(false);

  const talkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const idleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const contextRef = useRef(contextData);

  useEffect(() => {
    isVoiceEnabledRef.current = isVoiceEnabled;
  }, [isVoiceEnabled]);

  useEffect(() => {
    availableVoicesRef.current = availableVoices;
  }, [availableVoices]);

  useEffect(() => {
    contextRef.current = contextData;
    if (contextData) {
      cachedContextRef.current = { ...cachedContextRef.current, ...contextData };
    }
  }, [contextData]);

  // Track user interaction for speech policies
  useEffect(() => {
    const markInteraction = () => {
      userHasInteractedRef.current = true;
    };
    window.addEventListener('click', markInteraction, { capture: true });
    window.addEventListener('pointerdown', markInteraction, { capture: true });
    window.addEventListener('keydown', markInteraction, { capture: true });
    return () => {
      window.removeEventListener('click', markInteraction, { capture: true });
      window.removeEventListener('pointerdown', markInteraction, { capture: true });
      window.removeEventListener('keydown', markInteraction, { capture: true });
    };
  }, []);

  // Page entry intro (once per page per session when voice is on and user interacted)
  useEffect(() => {
    if (!isMounted || !isVoiceEnabled || !userHasInteractedRef.current) return;
    const introText = PAGE_INTROS[pathname];
    if (!introText) return;

    const sessionKey = `chiku_page_${pathname}`;
    let alreadySpoken = spokenPagesRef.current.has(pathname);
    if (!alreadySpoken && typeof window !== 'undefined') {
      try {
        alreadySpoken = sessionStorage.getItem(sessionKey) === '1';
      } catch {}
    }

    if (alreadySpoken) return;

    spokenPagesRef.current.add(pathname);
    try {
      sessionStorage.setItem(sessionKey, '1');
    } catch {}

    queueRef.current?.enqueue({
      key: `page:${pathname}`,
      group: 'page',
      priority: 2,
      parts: [introText],
    });
  }, [pathname, isMounted, isVoiceEnabled]);

  // Load available speech synthesis voices
  useEffect(() => {
    if (!isMounted || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    const loadVoices = () => {
      try {
        const list = window.speechSynthesis.getVoices();
        setAvailableVoices(list);
      } catch {
        // Speech synthesis access restricted
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, [isMounted]);

  // Initialize speech queue with injected SpeechAdapter
  useEffect(() => {
    if (!isMounted || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    const adapter: SpeechAdapter = {
      speak: (text: string, handlers: SpeechAdapterHandlers, isRetry?: boolean) => {
        const synth = window.speechSynthesis;
        synth.resume();

        const voices = availableVoicesRef.current;
        const primaryVoice = selectBestVoice(voices);
        const selectedVoice = isRetry ? selectBestVoice(voices, primaryVoice) : primaryVoice;

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }
        utterance.rate = CHIKU_SPEECH_RATE;
        utterance.pitch = CHIKU_SPEECH_PITCH;
        utterance.volume = 1;

        activeUtteranceRef.current = utterance;

        utterance.onstart = () => {
          handlers.onStart?.();
        };

        utterance.onend = () => {
          activeUtteranceRef.current = null;
          handlers.onEnd?.();
        };

        utterance.onerror = (e) => {
          activeUtteranceRef.current = null;
          handlers.onError?.(e.error);
        };

        synth.speak(utterance);
      },
      cancel: () => {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          window.speechSynthesis.cancel();
        }
        activeUtteranceRef.current = null;
      },
      resume: () => {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          window.speechSynthesis.resume();
        }
      },
    };

    const queue = new ChikuSpeechQueue({
      adapter,
      isVoiceEnabled: () => isVoiceEnabledRef.current,
      onSpeakingStateChange: (speaking, text) => {
        setIsSpeaking(speaking);
        if (text) {
          setCurrentText(text);
        }
        if (!speaking) {
          setCurrentSprite('idle');
        }
      },
      onStatusMessage: (msg) => {
        setVoiceStatusOverride(msg);
      },
      onDecision: (d: SpeechDecisionLog) => {
        const best = selectBestVoice(availableVoicesRef.current);
        const voiceName = best ? best.name : 'default';
        recordDebugEvent(
          d.eventKey,
          d.priority,
          `${d.decision} (${d.reason})`,
          voiceName
        );
      },
    });

    queueRef.current = queue;

    return () => {
      queue.stop();
      queueRef.current = null;
    };
  }, [isMounted, recordDebugEvent]);

  // Cancel speech on route change
  useEffect(() => {
    return () => {
      queueRef.current?.stop();
    };
  }, [pathname]);

  // Welcome line triggered on first gesture for returning users who already had voice on
  useEffect(() => {
    if (!isMounted || !isVoiceEnabled || hasSpokenWelcomeRef.current) return;

    const handleFirstUserGesture = () => {
      if (hasSpokenWelcomeRef.current) return;
      hasSpokenWelcomeRef.current = true;
      setCurrentText(CHIKU_WELCOME_TEXT);
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.resume();
      }
      queueRef.current?.enqueue({
        key: 'welcome',
        group: 'view',
        priority: 3,
        parts: [CHIKU_WELCOME_TEXT],
      });
    };

    window.addEventListener('click', handleFirstUserGesture, { once: true });
    window.addEventListener('keydown', handleFirstUserGesture, { once: true });

    return () => {
      window.removeEventListener('click', handleFirstUserGesture);
      window.removeEventListener('keydown', handleFirstUserGesture);
    };
  }, [isMounted, isVoiceEnabled]);

  // Persist voice toggle and trigger synchronous gesture unlock
  const toggleVoice = () => {
    const next = !isVoiceEnabled;
    setUserVoiceEnabled(next);
    try {
      localStorage.setItem('terrapulse-chiku-voice', next ? 'on' : 'off');
    } catch {
      // Storage access blocked or restricted
    }

    if (!next) {
      queueRef.current?.stop();
      setIsSpeaking(false);
      setCurrentSprite('idle');
      setVoiceStatusOverride(null);
    } else {
      hasSpokenWelcomeRef.current = true;
      setCurrentText(CHIKU_WELCOME_TEXT);
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.resume();
      }
      queueRef.current?.enqueue({
        key: 'welcome',
        group: 'view',
        priority: 3,
        parts: [CHIKU_WELCOME_TEXT],
      });
    }
  };

  // Test voice handler: speaks test sentence synchronously on click
  const handleTestVoice = () => {
    if (!isVoiceEnabled) {
      setUserVoiceEnabled(true);
      try {
        localStorage.setItem('terrapulse-chiku-voice', 'on');
      } catch {}
    }
    setCurrentText(CHIKU_TEST_VOICE_TEXT);
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.resume();
    }
    queueRef.current?.enqueue({
      key: `test-voice:${Date.now()}`,
      group: 'view',
      priority: 3,
      parts: [CHIKU_TEST_VOICE_TEXT],
    });
  };

  // Explain this view: speaks context breakdown on /explore or page intro on other pages
  const handleExplainView = () => {
    if (!isVoiceEnabled) {
      setUserVoiceEnabled(true);
      try {
        localStorage.setItem('terrapulse-chiku-voice', 'on');
      } catch {}
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.resume();
    }

    if (pathname !== '/explore') {
      const intro = PAGE_INTROS[pathname] || PAGE_INTROS['/'] || '';
      setCurrentText(intro);
      queueRef.current?.enqueue({
        key: `explain-view:${pathname}:${Date.now()}`,
        group: 'view',
        priority: 3,
        parts: [intro],
      });
      return;
    }

    const ctx = cachedContextRef.current;
    if (!ctx || !ctx.caseTitle || ctx.caseId === 'upload') {
      const exploreIntro = PAGE_INTROS['/explore'] || '';
      setCurrentText(exploreIntro);
      queueRef.current?.enqueue({
        key: `explain-view:explore:${Date.now()}`,
        group: 'view',
        priority: 3,
        parts: [exploreIntro],
      });
      return;
    }

    const detail = narrationDetailRef.current;
    const parts: string[] = [];
    const beforeStr = formatRangeString(ctx.beforeRange);
    const afterStr = formatRangeString(ctx.afterRange);
    if (beforeStr && afterStr) {
      parts.push(`Loaded ${ctx.caseTitle}. Comparing ${beforeStr} with ${afterStr}.`);
    } else {
      parts.push(`Loaded ${ctx.caseTitle}.`);
    }

    const analysisParts = buildAnalysisNarrationParts({
      mode: ctx.mode,
      affectedAreaKm2: ctx.affectedAreaKm2,
      percentChanged: ctx.percentChanged,
      sensitivity: ctx.sensitivity,
      detail,
      honestyNote: ctx.honestyNote,
    });
    parts.push(...analysisParts);

    if (parts.length > 0 && parts[0]) {
      setCurrentText(parts[0]);
      queueRef.current?.enqueue({
        key: `explain-view:case:${ctx.caseId || 'selected'}:${Date.now()}`,
        group: 'view',
        priority: 3,
        parts,
      });

      if (detail === 'full' && ctx.honestyNote) {
        const noteLines = buildReliabilityNotesLines([ctx.honestyNote]);
        queueRef.current?.enqueue({
          key: `notes:${ctx.caseId || 'selected'}`,
          group: 'notes',
          priority: 1,
          parts: noteLines,
        });
      }
    }
  };

  // Persist minimized state
  const toggleMinimized = () => {
    const next = !isMinimized;
    setUserMinimized(next);
    try {
      localStorage.setItem('terrapulse-chiku-minimized', String(next));
    } catch {
      // Storage access blocked
    }
  };

  // Subscribe to accessibility announcer events ONCE (stable subscription)
  useEffect(() => {
    const unsubscribe = subscribe((event: AccessibilityEvent) => {
      // Update cached context from event data
      if (event.data) {
        cachedContextRef.current = {
          ...cachedContextRef.current,
          ...(event.data as Record<string, unknown>),
        };
      }

      // Handle interaction hints
      if (event.type === 'hint') {
        const eventData = event.data as Record<string, unknown> | undefined;
        const hintId = (eventData?.hintId as string) || event.message || '';
        const sessionKey = `chiku_hint_${hintId}`;
        let alreadySpoken = spokenHintsRef.current.has(hintId);
        if (!alreadySpoken && typeof window !== 'undefined') {
          try {
            alreadySpoken = sessionStorage.getItem(sessionKey) === '1';
          } catch {}
        }
        if (alreadySpoken) return;

        spokenHintsRef.current.add(hintId);
        try {
          sessionStorage.setItem(sessionKey, '1');
        } catch {}

        queueRef.current?.enqueue({
          key: `hint:${hintId}`,
          group: 'hint',
          priority: 1,
          parts: [event.message],
        });
        return;
      }

      const eventData = event.data as Record<string, unknown> | undefined;
      const keySuffix =
        typeof eventData?.caseId === 'string'
          ? eventData.caseId
          : typeof eventData?.mode === 'string'
          ? eventData.mode
          : '';

      if (event.type === 'analysis-ready') {
        setCurrentSprite('happy');
        setTimeout(() => {
          setCurrentSprite('idle');
        }, 1800);

        const detail = narrationDetailRef.current;
        const parts = buildAnalysisNarrationParts({
          mode: (eventData?.mode as string) || cachedContextRef.current.mode,
          affectedAreaKm2: (eventData?.affectedAreaKm2 as number) ?? cachedContextRef.current.affectedAreaKm2,
          percentChanged: (eventData?.percentChanged as number) ?? cachedContextRef.current.percentChanged,
          sensitivity: (eventData?.sensitivity as SensitivityData) || cachedContextRef.current.sensitivity,
          detail,
          honestyNote: (eventData?.honestyNote as string) || cachedContextRef.current.honestyNote,
        });

        if (parts.length > 0 && parts[0]) {
          setCurrentText(parts[0]);
        }

        queueRef.current?.enqueue({
          key: `analysis-ready:${keySuffix || 'current'}:${detail}`,
          group: 'analysis',
          priority: 3,
          parts,
        });
        return;
      }

      if (event.type === 'ai-insight-loaded') {
        const rawNotes =
          (eventData?.notes as string[] | undefined) ||
          ((cachedContextRef.current as Record<string, unknown>)?.notes as string[] | undefined);
        if (Array.isArray(rawNotes) && rawNotes.length > 0) {
          const noteLines = buildReliabilityNotesLines(rawNotes);
          const caseId = (eventData?.caseId as string) || cachedContextRef.current.caseId || 'current';
          queueRef.current?.enqueue({
            key: `notes:${caseId}`,
            group: 'notes',
            priority: 1,
            parts: noteLines,
          });
        }
        return;
      }

      const sentence = buildChikuScript(event, cachedContextRef.current);
      if (!sentence) return;

      const priority = getEventPriority(event.type);
      const group = getEventGroup(event.type);
      const parts = [sentence];

      queueRef.current?.enqueue({
        key: `${event.type}${keySuffix ? `:${keySuffix}` : ''}`,
        group,
        priority,
        parts,
      });
    });

    return () => {
      unsubscribe();
    };
  }, [subscribe]);

  // Speaking mouth animation (talk-1 <-> talk-2)
  useEffect(() => {
    if (prefersReducedMotion || !isSpeaking) {
      if (talkIntervalRef.current) clearInterval(talkIntervalRef.current);
      return;
    }

    let toggle = false;
    talkIntervalRef.current = setInterval(() => {
      toggle = !toggle;
      setCurrentSprite(toggle ? 'talk-1' : 'talk-2');
    }, 220);

    return () => {
      if (talkIntervalRef.current) clearInterval(talkIntervalRef.current);
    };
  }, [isSpeaking, prefersReducedMotion]);

  // Idle animation (blink & glances every 3-6 seconds)
  useEffect(() => {
    if (prefersReducedMotion || isSpeaking || currentSprite === 'happy') {
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
      return;
    }

    const scheduleNextIdle = () => {
      const delay = Math.floor(Math.random() * 3000) + 3000;
      idleTimeoutRef.current = setTimeout(() => {
        const rand = Math.random();
        if (rand < 0.6) {
          setCurrentSprite('blink');
          setTimeout(() => setCurrentSprite('idle'), 180);
        } else if (rand < 0.8) {
          setCurrentSprite('look-left');
          setTimeout(() => setCurrentSprite('idle'), 700);
        } else {
          setCurrentSprite('look-right');
          setTimeout(() => setCurrentSprite('idle'), 700);
        }
        scheduleNextIdle();
      }, delay);
    };

    scheduleNextIdle();

    return () => {
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
    };
  }, [isSpeaking, currentSprite, prefersReducedMotion]);

  // Collapsed view (minimized pill)
  if (isMinimized) {
    return (
      <div className={`fixed bottom-4 right-4 z-40 ${className}`}>
        <button
          type="button"
          onClick={toggleMinimized}
          aria-label="Expand Chiku Radar Guide"
          title="Expand Chiku Radar Guide"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-2 border border-hairline text-ink text-xs font-medium shadow-none hover:border-teal transition-colors focus:outline-2 focus:outline-teal focus:outline-offset-2"
        >
          <div className="relative w-6 h-6 shrink-0 overflow-hidden rounded-full border border-hairline bg-surface">
            <Image
              src={SPRITE_PATHS.idle}
              alt=""
              width={24}
              height={24}
              className="object-cover"
              unoptimized
            />
          </div>
          <span className="font-sans text-[11px] font-semibold">Chiku</span>
          <Maximize2 className="w-3 h-3 text-text-secondary" aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <aside
      aria-label="Chiku SAR Radar Guide"
      className={`fixed bottom-3 right-3 sm:bottom-4 sm:right-4 z-40 max-w-[calc(100vw-24px)] sm:max-w-sm w-84 bg-surface border border-hairline rounded-[2px] p-3 shadow-none ${className}`}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between pb-2 border-b border-hairline mb-2.5">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-teal" aria-hidden="true" />
          <span className="font-headline font-semibold text-xs text-ink">Chiku Guide</span>
          {isSpeaking && (
            <span className="font-data text-[10px] px-1 py-0.2 bg-teal/10 text-teal border border-teal/30 rounded-[2px]">
              Speaking
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {hasSpeechSupport && (
            <>
              <button
                type="button"
                onClick={() => {
                  queueRef.current?.stop();
                  setIsSpeaking(false);
                  setCurrentSprite('idle');
                }}
                aria-label="Stop Chiku narration"
                title="Stop Chiku narration"
                className="p-1 text-text-secondary hover:text-ink rounded-[2px] border border-transparent transition-colors focus:outline-2 focus:outline-teal focus:outline-offset-2"
              >
                <Square className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={toggleVoice}
                aria-pressed={isVoiceEnabled}
                aria-label={isVoiceEnabled ? 'Turn voice narration off' : 'Turn voice narration on'}
                title={isVoiceEnabled ? 'Turn voice narration off' : 'Turn voice narration on'}
                className={`p-1 rounded-[2px] transition-colors focus:outline-2 focus:outline-teal focus:outline-offset-2 ${
                  isVoiceEnabled
                    ? 'text-teal bg-teal/10 border border-teal/30'
                    : 'text-text-secondary hover:text-ink border border-transparent'
                }`}
              >
                {isVoiceEnabled ? (
                  <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                ) : (
                  <VolumeX className="w-3.5 h-3.5" aria-hidden="true" />
                )}
              </button>
            </>
          )}

          <button
            type="button"
            onClick={toggleMinimized}
            aria-label="Minimize Chiku Guide"
            title="Minimize Chiku Guide"
            className="p-1 text-text-secondary hover:text-ink rounded-[2px] border border-transparent transition-colors focus:outline-2 focus:outline-teal focus:outline-offset-2"
          >
            <Minimize2 className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Main body: Character avatar + Text bubble */}
      <div className="flex items-start gap-2.5">
        <div className="relative w-12 h-12 shrink-0 bg-transparent overflow-hidden">
          {ALL_SPRITES.map((sprite) => {
            const isVisible = prefersReducedMotion
              ? sprite === 'idle'
              : sprite === currentSprite || (!ALL_SPRITES.includes(currentSprite) && sprite === 'idle');
            return (
              <Image
                key={sprite}
                src={SPRITE_PATHS[sprite]}
                alt={isVisible ? 'Chiku, the Terra Pulse guide' : ''}
                aria-hidden={!isVisible}
                width={48}
                height={48}
                className={`absolute inset-0 w-12 h-12 object-contain bg-transparent transition-none pointer-events-none ${
                  isVisible ? 'opacity-100 visible' : 'opacity-0 invisible'
                }`}
                priority
                unoptimized
              />
            );
          })}
        </div>

        {/* Text bubble: Marked aria-hidden so screen readers rely on Step A live announcer instead of hearing double announcements */}
        <div
          aria-hidden="true"
          className="flex-1 bg-surface-2 border border-hairline rounded-[2px] p-2 text-xs text-ink font-sans leading-relaxed"
        >
          {currentText}
        </div>
      </div>

      {/* Footer controls: Status line + Test Voice + Screen reader note */}
      <div className="mt-2 pt-1.5 border-t border-hairline space-y-1 text-[10px] text-text-secondary font-sans">
        <div className="flex items-center justify-between gap-1">
          <span className="truncate max-w-47.5" title={voiceStatus}>
            {voiceStatus}
          </span>
          {hasSpeechSupport && (
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={handleExplainView}
                className="px-1.5 py-0.5 text-[10px] font-sans font-medium text-ink hover:text-teal border border-hairline rounded-[2px] bg-surface hover:bg-surface-2 transition-colors focus:outline-2 focus:outline-teal focus:outline-offset-2"
                title="Explain current view with Chiku"
              >
                Explain this view
              </button>
              <button
                type="button"
                onClick={handleTestVoice}
                className="px-1.5 py-0.5 text-[10px] font-sans font-medium text-teal hover:text-ink border border-hairline rounded-[2px] bg-surface hover:bg-surface-2 transition-colors focus:outline-2 focus:outline-teal focus:outline-offset-2"
                title="Test Chiku voice narration"
              >
                Test voice
              </button>
            </div>
          )}
        </div>
        {/* Narration detail toggle */}
        <div className="flex items-center justify-between text-[10px] text-text-secondary pt-1 border-t border-hairline/60">
          <span>Narration detail</span>
          <div className="flex items-center gap-1 border border-hairline rounded-[2px] p-0.5 bg-surface-2" role="radiogroup" aria-label="Narration detail level">
            <button
              type="button"
              role="radio"
              aria-checked={narrationDetail === 'full'}
              onClick={() => handleToggleNarrationDetail('full')}
              className={`px-1.5 py-0.5 rounded-[2px] font-sans font-medium transition-colors focus:outline-2 focus:outline-teal focus:outline-offset-2 ${
                narrationDetail === 'full'
                  ? 'bg-surface text-ink border border-hairline shadow-none font-semibold'
                  : 'text-text-secondary hover:text-ink border border-transparent'
              }`}
            >
              Full
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={narrationDetail === 'short'}
              onClick={() => handleToggleNarrationDetail('short')}
              className={`px-1.5 py-0.5 rounded-[2px] font-sans font-medium transition-colors focus:outline-2 focus:outline-teal focus:outline-offset-2 ${
                narrationDetail === 'short'
                  ? 'bg-surface text-ink border border-hairline shadow-none font-semibold'
                  : 'text-text-secondary hover:text-ink border border-transparent'
              }`}
            >
              Short
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between text-[9px] text-text-muted">
          <span className="italic">If you use a screen reader, keep voice off.</span>
        </div>
      </div>

      {/* Debug panel: visible when localStorage chikuDebug === '1', plain text, not an aria-live region */}
      {isDebug && (
        <div className="mt-2 pt-1.5 border-t border-hairline font-mono text-[9px] text-text-secondary space-y-1 max-h-40 overflow-y-auto">
          <div className="font-semibold text-ink flex items-center justify-between">
            <span>Chiku Debug (Last 12)</span>
            <span>
              {typeof window !== 'undefined' && 'speechSynthesis' in window
                ? `spk:${window.speechSynthesis.speaking ? 1 : 0} pnd:${window.speechSynthesis.pending ? 1 : 0} psd:${window.speechSynthesis.paused ? 1 : 0}`
                : 'no-synth'}
            </span>
          </div>
          {debugEvents.length === 0 ? (
            <div className="text-text-muted italic">No events logged yet</div>
          ) : (
            <div className="space-y-1 divide-y divide-hairline">
              {debugEvents.map((ev) => (
                <div key={ev.id} className="pt-0.5 leading-tight">
                  <div className="flex justify-between text-ink font-sans">
                    <span className="font-semibold">
                      [{ev.time}] {ev.key} (p{ev.priority})
                    </span>
                    <span
                      className={
                        ev.outcome.startsWith('dropped')
                          ? 'text-amber-500'
                          : ev.outcome.startsWith('error')
                          ? 'text-rose-500'
                          : 'text-teal'
                      }
                    >
                      {ev.outcome}
                    </span>
                  </div>
                  <div className="text-text-muted text-[8px] truncate">
                    voice: {ev.voice} | {ev.synthState}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
