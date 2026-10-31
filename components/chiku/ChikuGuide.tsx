'use client';

import { useState, useEffect, useRef, useCallback, useSyncExternalStore } from 'react';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Volume2, VolumeX, Minimize2, Maximize2, Sparkles } from 'lucide-react';
import { useAccessibility, type AccessibilityEvent } from '@/context';
import { buildChikuScript, type ChikuContextData } from '@/lib/chiku-script';

export const CHIKU_WELCOME_TEXT =
  "Welcome to Terra Pulse! I'm Chiku, your guide to seeing Earth change through radar.";
export const CHIKU_TEST_VOICE_TEXT = 'Chiku voice test.';

export const CHIKU_SPEECH_RATE = 0.95;
export const CHIKU_SPEECH_PITCH = 1.05;
const CANCEL_SPEAK_DELAY_MS = 80;
const WATCHDOG_TIMEOUT_MS = 1500;

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

function logChikuEvent(
  name: string,
  priority: number,
  voiceEnabled: boolean,
  willSpeak: boolean,
  voice: SpeechSynthesisVoice | null,
  before: { speaking: boolean; pending: boolean; paused: boolean },
  after?: { speaking: boolean; pending: boolean; paused: boolean }
) {
  if (!isChikuDebug()) return;
  console.log(`[Chiku:Event] ${name}`, {
    name,
    priority,
    voiceEnabled,
    speakCalled: willSpeak,
    selectedVoice: voice
      ? { name: voice.name, localService: voice.localService, lang: voice.lang }
      : 'default',
    speechStateBefore: before,
    speechStateAfter: after,
  });
}

function logUtterance(event: 'onstart' | 'onend' | 'onerror', details: Record<string, unknown>) {
  if (!isChikuDebug()) return;
  console.log(`[Chiku:Utterance:${event}]`, details);
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

function getEventPriority(eventType: string): number {
  switch (eventType) {
    case 'ai-insight-loaded':
    case 'ai-interpretation':
      return 1;
    case 'mode-changed':
    case 'case-selected':
    case 'upload-accepted':
      return 2;
    case 'processing':
    case 'analysis-loading':
    case 'analysis-ready':
    case 'analysis-failed':
    case 'upload-rejected':
    case 'welcome':
    case 'test-voice':
      return 3;
    default:
      return 2;
  }
}

export function ChikuGuide({ contextData, className = '' }: ChikuGuideProps) {
  const pathname = usePathname();
  const { subscribe } = useAccessibility();
  const isMounted = useIsClientMounted();

  // User-explicit overrides for voice and minimized state
  const [userVoiceEnabled, setUserVoiceEnabled] = useState<boolean | null>(null);
  const [userMinimized, setUserMinimized] = useState<boolean | null>(null);

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

  const hasSpeechSupport = isMounted && typeof window !== 'undefined' && 'speechSynthesis' in window;

  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [voiceStatus, setVoiceStatus] = useState<string>('Voice off');
  const [currentText, setCurrentText] = useState<string>(
    'Hi! I am Chiku, your guide to seeing Earth change through radar. Select any case study to begin exploration.'
  );

  // Sprite animation state
  const [currentSprite, setCurrentSprite] = useState<ChikuSprite>('idle');
  const prefersReducedMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    getServerReducedMotionSnapshot
  );

  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const currentPriorityRef = useRef<number>(0);
  const pendingSpeakTimerRef = useRef<NodeJS.Timeout | null>(null);
  const watchdogTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasSpokenWelcomeRef = useRef<boolean>(false);
  const hasStartedRef = useRef<boolean>(false);

  const talkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const idleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const contextRef = useRef(contextData);

  useEffect(() => {
    contextRef.current = contextData;
  }, [contextData]);

  // Initialize SpeechSynthesis voices safely
  useEffect(() => {
    if (!isMounted || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    const loadVoices = () => {
      try {
        const list = window.speechSynthesis.getVoices();
        voicesRef.current = list;
        const bestVoice = selectBestVoice(list);
        if (isVoiceEnabled && !isSpeaking) {
          setVoiceStatus(bestVoice ? `Voice ready (${bestVoice.name})` : 'Voice ready (Default)');
        }
      } catch {
        // Speech synthesis access restricted
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      // Clean up voiceschanged listener
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, [isMounted, isVoiceEnabled, isSpeaking]);

  // Synchronize initial voice status when mounted or toggled
  useEffect(() => {
    if (!isMounted) return;
    if (!isVoiceEnabled) {
      setVoiceStatus('Voice off');
    } else if (!isSpeaking) {
      const best = selectBestVoice(voicesRef.current);
      setVoiceStatus(best ? `Voice ready (${best.name})` : 'Voice ready (Default)');
    }
  }, [isMounted, isVoiceEnabled, isSpeaking]);

  // Cancel speech on route change or unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (pendingSpeakTimerRef.current) {
        clearTimeout(pendingSpeakTimerRef.current);
        pendingSpeakTimerRef.current = null;
      }
      if (watchdogTimerRef.current) {
        clearTimeout(watchdogTimerRef.current);
        watchdogTimerRef.current = null;
      }
    };
  }, [pathname]);

  // Core Speech Utterance Runner
  const speakLine = useCallback(
    (
      text: string,
      eventName: string,
      priority: number,
      isSynchronousGesture: boolean = false,
      retryCount: number = 0,
      voiceOverride?: SpeechSynthesisVoice | null
    ) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

      const synth = window.speechSynthesis;
      const beforeState = { speaking: synth.speaking, pending: synth.pending, paused: synth.paused };

      // If voice is not enabled and this is not a gesture test voice / welcome call
      if (!isVoiceEnabled && eventName !== 'test-voice' && eventName !== 'welcome') {
        logChikuEvent(eventName, priority, false, false, null, beforeState);
        return;
      }

      // Priority check: equal or higher priority cancels & speaks; lower is dropped
      if (synth.speaking && priority < currentPriorityRef.current) {
        logChikuEvent(eventName, priority, true, false, null, beforeState);
        return;
      }

      // Clear any pending delayed speak timer from an earlier event
      if (pendingSpeakTimerRef.current) {
        clearTimeout(pendingSpeakTimerRef.current);
        pendingSpeakTimerRef.current = null;
      }
      if (watchdogTimerRef.current) {
        clearTimeout(watchdogTimerRef.current);
        watchdogTimerRef.current = null;
      }

      currentPriorityRef.current = priority;

      const performSpeak = () => {
        try {
          synth.resume();
          const selectedVoice =
            voiceOverride !== undefined ? voiceOverride : selectBestVoice(voicesRef.current);

          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = 'en-US';
          if (selectedVoice) {
            utterance.voice = selectedVoice;
          }
          utterance.rate = CHIKU_SPEECH_RATE;
          utterance.pitch = CHIKU_SPEECH_PITCH;
          utterance.volume = 1;

          activeUtteranceRef.current = utterance;
          hasStartedRef.current = false;

          // Watchdog: verify onstart fires within WATCHDOG_TIMEOUT_MS
          watchdogTimerRef.current = setTimeout(() => {
            if (!hasStartedRef.current && typeof window !== 'undefined' && 'speechSynthesis' in window) {
              if (!window.speechSynthesis.speaking) {
                logUtterance('onerror', { error: 'watchdog-timeout-no-start', retryCount });
                synth.cancel();
                synth.resume();
                if (retryCount === 0) {
                  const fallbackVoice = selectBestVoice(voicesRef.current, selectedVoice);
                  speakLine(text, eventName, priority, false, 1, fallbackVoice);
                } else {
                  setVoiceStatus('No voice found on this device');
                  setIsSpeaking(false);
                  setCurrentSprite('idle');
                  currentPriorityRef.current = 0;
                  activeUtteranceRef.current = null;
                }
              }
            }
          }, WATCHDOG_TIMEOUT_MS);

          utterance.onstart = () => {
            hasStartedRef.current = true;
            if (watchdogTimerRef.current) {
              clearTimeout(watchdogTimerRef.current);
              watchdogTimerRef.current = null;
            }
            logUtterance('onstart', { text, voice: selectedVoice?.name });
            setIsSpeaking(true);
            setVoiceStatus('Speaking...');
          };

          utterance.onend = () => {
            if (watchdogTimerRef.current) {
              clearTimeout(watchdogTimerRef.current);
              watchdogTimerRef.current = null;
            }
            logUtterance('onend', { textLength: text.length });
            activeUtteranceRef.current = null;
            setIsSpeaking(false);
            setCurrentSprite('idle');
            currentPriorityRef.current = 0;
            const currentVoice = selectedVoice || selectBestVoice(voicesRef.current);
            setVoiceStatus(currentVoice ? `Voice ready (${currentVoice.name})` : 'Voice ready (Default)');
          };

          utterance.onerror = (e) => {
            if (watchdogTimerRef.current) {
              clearTimeout(watchdogTimerRef.current);
              watchdogTimerRef.current = null;
            }
            logUtterance('onerror', { error: e.error, retryCount });
            activeUtteranceRef.current = null;

            if (e.error === 'interrupted' || e.error === 'canceled') {
              // Expected cancelation from a newer event
              return;
            }

            if (e.error === 'not-allowed') {
              setVoiceStatus('Blocked by browser: press Voice on');
              setIsSpeaking(false);
              setCurrentSprite('idle');
              currentPriorityRef.current = 0;
              return;
            }

            if (
              retryCount === 0 &&
              ['synthesis-failed', 'synthesis-unavailable', 'network', 'audio-busy'].includes(e.error)
            ) {
              synth.cancel();
              synth.resume();
              const fallbackVoice = selectBestVoice(voicesRef.current, selectedVoice);
              speakLine(text, eventName, priority, false, 1, fallbackVoice);
              return;
            }

            setVoiceStatus(`Voice error: ${e.error}`);
            setIsSpeaking(false);
            setCurrentSprite('idle');
            currentPriorityRef.current = 0;
          };

          synth.speak(utterance);

          const afterState = { speaking: synth.speaking, pending: synth.pending, paused: synth.paused };
          logChikuEvent(eventName, priority, true, true, selectedVoice, beforeState, afterState);
        } catch {
          setVoiceStatus('Voice unavailable on this device');
          setIsSpeaking(false);
          setCurrentSprite('idle');
          currentPriorityRef.current = 0;
          activeUtteranceRef.current = null;
        }
      };

      if (isSynchronousGesture) {
        if (synth.speaking || synth.pending) {
          synth.cancel();
        }
        performSpeak();
      } else {
        if (synth.speaking || synth.pending) {
          synth.cancel();
          pendingSpeakTimerRef.current = setTimeout(() => {
            pendingSpeakTimerRef.current = null;
            performSpeak();
          }, CANCEL_SPEAK_DELAY_MS);
        } else {
          performSpeak();
        }
      }
    },
    [isVoiceEnabled]
  );

  // Welcome line triggered on first gesture for returning users who already had voice on
  useEffect(() => {
    if (!isMounted || !isVoiceEnabled || hasSpokenWelcomeRef.current) return;

    const handleFirstUserGesture = () => {
      if (hasSpokenWelcomeRef.current) return;
      hasSpokenWelcomeRef.current = true;
      setCurrentText(CHIKU_WELCOME_TEXT);
      speakLine(CHIKU_WELCOME_TEXT, 'welcome', 3, true);
    };

    window.addEventListener('click', handleFirstUserGesture, { once: true });
    window.addEventListener('keydown', handleFirstUserGesture, { once: true });

    return () => {
      window.removeEventListener('click', handleFirstUserGesture);
      window.removeEventListener('keydown', handleFirstUserGesture);
    };
  }, [isMounted, isVoiceEnabled, speakLine]);

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
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (pendingSpeakTimerRef.current) {
        clearTimeout(pendingSpeakTimerRef.current);
        pendingSpeakTimerRef.current = null;
      }
      if (watchdogTimerRef.current) {
        clearTimeout(watchdogTimerRef.current);
        watchdogTimerRef.current = null;
      }
      setIsSpeaking(false);
      setCurrentSprite('idle');
      setVoiceStatus('Voice off');
      currentPriorityRef.current = 0;
    } else {
      // Synchronously call resume() and speak Welcome on gesture
      hasSpokenWelcomeRef.current = true;
      setCurrentText(CHIKU_WELCOME_TEXT);
      speakLine(CHIKU_WELCOME_TEXT, 'welcome', 3, true);
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
    speakLine(CHIKU_TEST_VOICE_TEXT, 'test-voice', 3, true);
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

  // Subscribe to accessibility announcer events
  useEffect(() => {
    const unsubscribe = subscribe((event: AccessibilityEvent) => {
      const sentence = buildChikuScript(event, contextRef.current);
      setCurrentText(sentence);

      if (event.type === 'analysis-ready') {
        setCurrentSprite('happy');
        setTimeout(() => {
          setCurrentSprite('idle');
        }, 1800);
      }

      const priority = getEventPriority(event.type);
      speakLine(sentence, event.type, priority, false);
    });

    return () => {
      unsubscribe();
    };
  }, [subscribe, speakLine]);

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
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-2 border border-hairline text-ink text-xs font-medium shadow-none hover:border-teal transition-colors focus:outline focus:outline-2 focus:outline-teal focus:outline-offset-2"
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
            <button
              type="button"
              onClick={toggleVoice}
              aria-pressed={isVoiceEnabled}
              aria-label={isVoiceEnabled ? 'Turn voice narration off' : 'Turn voice narration on'}
              title={isVoiceEnabled ? 'Turn voice narration off' : 'Turn voice narration on'}
              className={`p-1 rounded-[2px] transition-colors focus:outline focus:outline-2 focus:outline-teal focus:outline-offset-2 ${
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
          )}

          <button
            type="button"
            onClick={toggleMinimized}
            aria-label="Minimize Chiku Guide"
            title="Minimize Chiku Guide"
            className="p-1 text-text-secondary hover:text-ink rounded-[2px] border border-transparent transition-colors focus:outline focus:outline-2 focus:outline-teal focus:outline-offset-2"
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
          <span className="truncate max-w-[190px]" title={voiceStatus}>
            {voiceStatus}
          </span>
          {hasSpeechSupport && (
            <button
              type="button"
              onClick={handleTestVoice}
              className="px-1.5 py-0.5 shrink-0 text-[10px] font-sans font-medium text-teal hover:text-ink border border-hairline rounded-[2px] bg-surface hover:bg-surface-2 transition-colors focus:outline focus:outline-2 focus:outline-teal focus:outline-offset-2"
              title="Test Chiku voice narration"
            >
              Test voice
            </button>
          )}
        </div>
        <div className="flex items-center justify-between text-[9px] text-text-muted">
          <span className="italic">If you use a screen reader, keep voice off.</span>
        </div>
      </div>
    </aside>
  );
}
