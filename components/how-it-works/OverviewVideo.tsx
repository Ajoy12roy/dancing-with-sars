'use client';

import { useState, useEffect, useRef } from 'react';
import { Play, ExternalLink } from 'lucide-react';
import { useNetworkMode } from '@/context';
import { buildYouTubeEmbedUrl } from '@/lib/video';

export const VIDEO_CREDIT_LINE =
  'Contains modified Copernicus Sentinel data (ESA). NASA-ISRO NISAR data via ASF DAAC. River erosion estimate: UNDP Bangladesh. Some background footage is an AI-generated illustration.';

export const VIDEO_TRANSCRIPT =
  'Optical satellites see only clouds in monsoon. Radar sees through them. River erosion takes an estimated 8,700 hectares a year in Bangladesh. Using Sentinel-1 and NASA-ISRO NISAR radar, TerraPulse shows what changed between two dates, like floodwater across Sylhet, with sensitivity ranges. Observations, not forecasts. Open source, for researchers, planners and communities. TerraPulse: Earth insights, a safer tomorrow.';

interface OverviewVideoProps {
  videoId: string;
  title: string;
}

export function OverviewVideo({ videoId, title }: OverviewVideoProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [posterError, setPosterError] = useState(false);
  const [isClientOnline, setIsClientOnline] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const { effectiveOffline } = useNetworkMode();

  useEffect(() => {
    setIsClientOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);
    const handleOnline = () => setIsClientOnline(true);
    const handleOffline = () => setIsClientOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const isOffline = effectiveOffline || !isClientOnline;
  const embedUrl = buildYouTubeEmbedUrl(videoId);

  const handlePlay = () => {
    if (isOffline) return;
    setIsPlaying(true);
  };

  useEffect(() => {
    if (isPlaying && iframeRef.current) {
      iframeRef.current.focus();
    }
  }, [isPlaying]);

  return (
    <div className="w-full max-w-[960px] space-y-4">
      {/* 16:9 Video Box */}
      <div className="aspect-video w-full border border-hairline rounded-[2px] bg-surface-2 relative overflow-hidden flex items-center justify-center">
        {isPlaying ? (
          <iframe
            ref={iframeRef}
            src={embedUrl}
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
                  onClick={handlePlay}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handlePlay();
                    }
                  }}
                  aria-label="Play the 30-second overview video"
                  className="min-h-[44px] min-w-[44px] px-5 py-2.5 bg-accent text-text-on-accent hover:bg-accent-hover font-medium text-sm rounded-[2px] transition-colors flex items-center gap-2 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  <Play className="w-4 h-4 fill-current shrink-0" aria-hidden="true" />
                  <span>Play video</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Video Details & Transcript below player */}
      <div className="space-y-3">
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
