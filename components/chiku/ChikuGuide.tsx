'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Volume2, VolumeX, Minimize2, Maximize2, Sparkles } from 'lucide-react';
import { useAccessibility, type AccessibilityEvent } from '@/context';
import { buildChikuScript, type ChikuContextData } from '@/lib/chiku-script';

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

export function ChikuGuide({ contextData, className = '' }: ChikuGuideProps) {
  const pathname = usePathname();
  const { subscribe } = useAccessibility();

  // Voice toggle state (OFF BY DEFAULT)
  const [isVoiceEnabled, setIsVoiceEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem('terrapulse-chiku-voice') === 'on';
    } catch {
      return false;
    }
  });

  // Minimized state
  const [isMinimized, setIsMinimized] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem('terrapulse-chiku-minimized') === 'true';
    } catch {
      return false;
    }
  });

  // Speech synthesis availability initialized lazily
  const [hasSpeechSupport] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return 'speechSynthesis' in window;
  });

  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [currentText, setCurrentText] = useState<string>(
    'Hi! I am Chiku, your SAR radar companion. Select any case study to begin exploration.'
  );

  // Sprite animation state
  const [currentSprite, setCurrentSprite] = useState<ChikuSprite>('idle');
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const talkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const idleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const contextRef = useRef(contextData);

  useEffect(() => {
    contextRef.current = contextData;
  }, [contextData]);

  // Subscribe to prefers-reduced-motion changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Initialize SpeechSynthesis voices
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    const loadVoices = () => {
      voicesRef.current = window.speechSynthesis.getVoices();
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Cancel speech on route change or unmount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, [pathname]);

  // Persist voice toggle
  const toggleVoice = () => {
    const next = !isVoiceEnabled;
    setIsVoiceEnabled(next);
    try {
      localStorage.setItem('terrapulse-chiku-voice', next ? 'on' : 'off');
    } catch {
      // Storage access blocked or restricted
    }
    if (!next && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setCurrentSprite('idle');
    }
  };

  // Persist minimized state
  const toggleMinimized = () => {
    const next = !isMinimized;
    setIsMinimized(next);
    try {
      localStorage.setItem('terrapulse-chiku-minimized', String(next));
    } catch {
      // Storage access blocked
    }
  };

  // Speech utterance runner
  const speakUtterance = useCallback(
    (text: string) => {
      if (!isVoiceEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) {
        return;
      }

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';

      // Pick standard English voice
      if (voicesRef.current.length > 0) {
        const enVoice =
          voicesRef.current.find((v) => v.lang.startsWith('en') && !v.name.includes('Google')) ||
          voicesRef.current.find((v) => v.lang.startsWith('en')) ||
          voicesRef.current[0];
        if (enVoice) utterance.voice = enVoice;
      }

      utterance.rate = 1.0;
      utterance.pitch = 1.1; // Friendly tone

      utterance.onstart = () => {
        setIsSpeaking(true);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        setCurrentSprite('idle');
      };

      utterance.onerror = () => {
        setIsSpeaking(false);
        setCurrentSprite('idle');
      };

      window.speechSynthesis.speak(utterance);
    },
    [isVoiceEnabled]
  );

  // Subscribe to Step A events (mode changed, case selected, analysis ready, etc.)
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

      speakUtterance(sentence);
    });

    return () => {
      unsubscribe();
    };
  }, [subscribe, speakUtterance]);

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
      const delay = Math.floor(Math.random() * 3000) + 3000; // 3 to 6 sec
      idleTimeoutRef.current = setTimeout(() => {
        const rand = Math.random();
        if (rand < 0.6) {
          // Blink
          setCurrentSprite('blink');
          setTimeout(() => setCurrentSprite('idle'), 180);
        } else if (rand < 0.8) {
          // Look left
          setCurrentSprite('look-left');
          setTimeout(() => setCurrentSprite('idle'), 700);
        } else {
          // Look right
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

  // Collapsed view (40px icon button)
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
        <div className="relative w-12 h-12 shrink-0 border border-hairline rounded-[2px] bg-surface-2 overflow-hidden flex items-center justify-center">
          <Image
            src={SPRITE_PATHS[currentSprite] || SPRITE_PATHS.idle}
            alt="Chiku the radar assistant"
            width={48}
            height={48}
            className="object-contain"
            priority
            unoptimized
          />
        </div>

        {/* Text bubble: Marked aria-hidden so screen readers rely on Step A live announcer instead of hearing double announcements */}
        <div
          aria-hidden="true"
          className="flex-1 bg-surface-2 border border-hairline rounded-[2px] p-2 text-xs text-ink font-sans leading-relaxed"
        >
          {currentText}
        </div>
      </div>

      {/* Screen reader note for voice toggle */}
      {hasSpeechSupport && (
        <div className="mt-2 pt-1.5 border-t border-hairline flex items-center justify-between text-[10px] text-text-secondary font-sans">
          <span>Voice: {isVoiceEnabled ? 'ON' : 'OFF (default)'}</span>
          <span className="italic">Screen reader users: keep voice off</span>
        </div>
      )}
    </aside>
  );
}
