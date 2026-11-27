'use client';

import { useState, useEffect, useRef, useSyncExternalStore } from 'react';
import { Play, ExternalLink } from 'lucide-react';
import { useReducedMotion } from 'framer-motion';
import { useNetworkMode } from '@/context';
import {
  YOUTUBE_PRIVACY_HOST,
  YOUTUBE_IFRAME_API_URL,
  PLAY_VISIBILITY_THRESHOLD,
  PAUSE_VISIBILITY_THRESHOLD,
  buildYouTubeEmbedUrl,
  buildYouTubePlayerVars,
  decideScrollPlaybackAction,
  handlePlayerStateChange,
  type YouTubePlayerVars,
  type ScrollPlaybackState,
} from '@/lib/video';
import { VideoStage } from '@/components/how-it-works/VideoStage';

export const AUTOPLAY_MUTED_NOTICE =
  'Sound is off. Use the speaker icon in the player to turn it on.';

export const VIDEO_CREDIT_LINE =
  'Contains modified Copernicus Sentinel data (ESA). NASA-ISRO NISAR data via ASF DAAC. River erosion estimate: UNDP Bangladesh. Some background footage is an AI-generated illustration.';

export const VIDEO_TRANSCRIPT =
  'Optical satellites see only clouds in monsoon. Radar sees through them. River erosion takes an estimated 8,700 hectares a year in Bangladesh. Using Sentinel-1 and NASA-ISRO NISAR radar, TerraPulse shows what changed between two dates, like floodwater across Sylhet, with sensitivity ranges. Observations, not forecasts. Open source, for researchers, planners and communities. TerraPulse: Earth insights, a safer tomorrow.';

interface YTPlayerInstance {
  playVideo: () => void;
  pauseVideo: () => void;
  mute: () => void;
  isMuted: () => boolean;
  destroy: () => void;
}

interface YTStateChangeEvent {
  data: number;
}

interface YTPlayerOptions {
  host?: string;
  videoId: string;
  playerVars?: YouTubePlayerVars;
  events?: {
    onReady?: () => void;
    onStateChange?: (event: YTStateChangeEvent) => void;
    onError?: () => void;
  };
}

interface YTNamespace {
  Player: new (element: HTMLElement, options: YTPlayerOptions) => YTPlayerInstance;
}

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let ytApiPromise: Promise<void> | null = null;

function loadYouTubeIframeApi(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('No window'));
  }
  if (window.YT?.Player) {
    return Promise.resolve();
  }
  if (ytApiPromise) {
    return ytApiPromise;
  }

  ytApiPromise = new Promise<void>((resolve, reject) => {
    let settled = false;
    const timeoutId = window.setTimeout(() => {
      if (!settled) {
        settled = true;
        ytApiPromise = null;
        reject(new Error('YouTube IFrame API load timeout'));
      }
    }, 6000);

    const prevCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prevCallback?.();
      if (!settled) {
        settled = true;
        window.clearTimeout(timeoutId);
        resolve();
      }
    };

    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${YOUTUBE_IFRAME_API_URL}"]`
    );
    if (!existingScript) {
      const script = document.createElement('script');
      script.src = YOUTUBE_IFRAME_API_URL;
      script.async = true;
      script.onerror = () => {
        if (!settled) {
          settled = true;
          window.clearTimeout(timeoutId);
          ytApiPromise = null;
          reject(new Error('Failed to load YouTube IFrame API'));
        }
      };
      document.head.appendChild(script);
    }
  });

  return ytApiPromise;
}

function subscribeOnline(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

function getOnlineSnapshot() {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

function getOnlineServerSnapshot() {
  return true;
}

interface OverviewVideoProps {
  videoId: string;
  title: string;
  aspectRatio?: string;
}

export function OverviewVideo({ videoId, title, aspectRatio = '16 / 9' }: OverviewVideoProps) {
  const shouldReduceMotion = useReducedMotion();
  const { effectiveOffline } = useNetworkMode();
  const isBrowserOnline = useSyncExternalStore(
    subscribeOnline,
    getOnlineSnapshot,
    getOnlineServerSnapshot
  );

  const isOffline = effectiveOffline || !isBrowserOnline;
  const canUseScrollApi = !isOffline && !shouldReduceMotion;

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [posterError, setPosterError] = useState(false);
  const [nearViewport, setNearViewport] = useState(false);
  const [apiReady, setApiReady] = useState(false);
  const [apiFailed, setApiFailed] = useState(false);
  const [fallbackPlaying, setFallbackPlaying] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const playerHostRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YTPlayerInstance | null>(null);
  const playerReadyRef = useRef(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const currentRatioRef = useRef(0);
  const playbackStateRef = useRef<ScrollPlaybackState>({
    isPlaying: false,
    pausedByScroll: false,
    userPaused: false,
  });

  const useFallbackMode = !canUseScrollApi || apiFailed;
  const fallbackEmbedUrl = buildYouTubeEmbedUrl(videoId);

  // 1. Observe near-viewport to lazily load YouTube IFrame API once
  useEffect(() => {
    if (!canUseScrollApi || apiFailed || nearViewport) return;
    if (typeof IntersectionObserver === 'undefined') return;
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setNearViewport(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [canUseScrollApi, apiFailed, nearViewport]);

  // 2. Load YouTube IFrame API when near viewport
  useEffect(() => {
    if (!nearViewport || !canUseScrollApi || apiFailed || apiReady) return;
    let cancelled = false;
    loadYouTubeIframeApi()
      .then(() => {
        if (!cancelled) setApiReady(true);
      })
      .catch(() => {
        if (!cancelled) setApiFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [nearViewport, canUseScrollApi, apiFailed, apiReady]);

  // 3. Instantiate YT.Player when API is ready
  useEffect(() => {
    if (!apiReady || useFallbackMode || !playerHostRef.current || !window.YT?.Player) {
      return;
    }

    let player: YTPlayerInstance | null = null;
    try {
      player = new window.YT.Player(playerHostRef.current, {
        host: YOUTUBE_PRIVACY_HOST,
        videoId,
        playerVars: buildYouTubePlayerVars(videoId),
        events: {
          onReady: () => {
            playerReadyRef.current = true;
            const decision = decideScrollPlaybackAction(
              currentRatioRef.current,
              playbackStateRef.current,
              canUseScrollApi
            );
            playbackStateRef.current = decision.nextState;
            if (decision.action === 'play_muted' && player) {
              player.mute();
              player.playVideo();
              setIsPlaying(true);
              setIsMuted(true);
            }
          },
          onStateChange: (event: YTStateChangeEvent) => {
            const next = handlePlayerStateChange(
              event.data,
              currentRatioRef.current,
              playbackStateRef.current
            );
            playbackStateRef.current = next;
            setIsPlaying(next.isPlaying);
            if (player) {
              try {
                setIsMuted(next.isPlaying && player.isMuted());
              } catch {
                // ignore if player is tearing down
              }
            } else {
              setIsMuted(false);
            }
          },
          onError: () => {
            setApiFailed(true);
          },
        },
      });
      playerRef.current = player;
    } catch {
      queueMicrotask(() => setApiFailed(true));
    }

    return () => {
      playerReadyRef.current = false;
      playerRef.current = null;
      if (player) {
        try {
          player.destroy();
        } catch {
          // ignore cleanup errors
        }
      }
    };
  }, [apiReady, useFallbackMode, videoId, canUseScrollApi]);

  // 4. Observe visibility (>= 0.5 play muted, < 0.25 pause)
  useEffect(() => {
    if (useFallbackMode || typeof IntersectionObserver === 'undefined') return;
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        const ratio = entry.intersectionRatio;
        currentRatioRef.current = ratio;

        if (!playerReadyRef.current || !playerRef.current) return;

        const decision = decideScrollPlaybackAction(
          ratio,
          playbackStateRef.current,
          canUseScrollApi
        );
        playbackStateRef.current = decision.nextState;

        if (decision.action === 'play_muted') {
          playerRef.current.mute();
          playerRef.current.playVideo();
          setIsPlaying(true);
          setIsMuted(true);
        } else if (decision.action === 'pause_scroll') {
          playerRef.current.pauseVideo();
          setIsPlaying(false);
          setIsMuted(false);
        }
      },
      { threshold: [0, PAUSE_VISIBILITY_THRESHOLD, PLAY_VISIBILITY_THRESHOLD, 0.75, 1] }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [useFallbackMode, canUseScrollApi]);

  // 5. Poll getMuted / isMuted while playing so unmute hides the notice promptly
  useEffect(() => {
    if (!isPlaying || useFallbackMode) return;
    const intervalId = window.setInterval(() => {
      const p = playerRef.current;
      if (!p || !playerReadyRef.current) return;
      try {
        setIsMuted(p.isMuted());
      } catch {
        // ignore
      }
    }, 500);
    return () => window.clearInterval(intervalId);
  }, [isPlaying, useFallbackMode]);

  const handleFallbackPlay = () => {
    if (isOffline) return;
    setFallbackPlaying(true);
  };

  useEffect(() => {
    if (fallbackPlaying && iframeRef.current) {
      iframeRef.current.focus();
    }
  }, [fallbackPlaying]);

  const effectivePlaying = useFallbackMode ? fallbackPlaying : isPlaying;

  return (
    <div className="w-full max-w-5xl space-y-4">
      {/* Video Stage */}
      <div ref={containerRef}>
        <VideoStage aspectRatio={aspectRatio} isPlaying={effectivePlaying}>
          {!useFallbackMode && apiReady ? (
            <div ref={playerHostRef} className="w-full h-full" title={title} />
          ) : fallbackPlaying ? (
            <iframe
              ref={iframeRef}
              src={fallbackEmbedUrl}
              title={title}
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              className="w-full h-full border-0"
              tabIndex={0}
            />
          ) : (
            <div className="absolute inset-0 w-full h-full flex items-center justify-center">
              {/* Poster or Fallback Brand Mark */}
              {!posterError ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src="/video/how-it-works-poster.jpg"
                  alt=""
                  aria-hidden="true"
                  onError={() => setPosterError(true)}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 w-full h-full bg-surface-2 flex flex-col items-center justify-center p-6 text-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/brand/terrapulse-globe.png"
                    alt="TerraPulse brand mark"
                    className="w-24 h-24 md:w-32 md:h-32 object-contain opacity-80 mb-2 pointer-events-none"
                  />
                </div>
              )}

              {/* Overlay Action */}
              <div className="relative z-10 flex flex-col items-center justify-center p-4">
                {isOffline ? (
                  <div className="bg-surface/95 border border-hairline px-4 py-2.5 rounded-[2px] text-xs font-sans text-text-secondary text-center shadow-none">
                    The video needs an internet connection.
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleFallbackPlay}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleFallbackPlay();
                      }
                    }}
                    aria-label="Play the project video"
                    className="min-h-[44px] min-w-[44px] px-5 py-2.5 bg-accent text-text-on-accent hover:bg-accent-hover font-medium text-sm rounded-[2px] transition-colors flex items-center gap-2 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    <Play className="w-4 h-4 fill-current shrink-0" aria-hidden="true" />
                    <span>Play video</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </VideoStage>
      </div>

      {/* Video Details & Transcript below player */}
      <div className="space-y-3">
        {!useFallbackMode && isPlaying && isMuted && (
          <p className="text-xs font-sans text-text-secondary">
            {AUTOPLAY_MUTED_NOTICE}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <a
            href={`https://youtu.be/${videoId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-data text-accent hover:underline inline-flex items-center gap-1 focus-visible:outline-2 focus-visible:outline-accent"
          >
            <span>Watch on YouTube</span>
            <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
          </a>
        </div>

        <p className="text-xs text-text-secondary leading-relaxed font-sans">
          {VIDEO_CREDIT_LINE}
        </p>

        <details className="border border-hairline rounded-[2px] bg-surface p-3 text-xs text-text-secondary group">
          <summary className="cursor-pointer font-medium text-text-primary hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent select-none">
            Read the transcript
          </summary>
          <p className="mt-2 text-xs text-text-secondary leading-relaxed font-sans pt-2 border-t border-hairline">
            {VIDEO_TRANSCRIPT}
          </p>
        </details>
      </div>
    </div>
  );
}
