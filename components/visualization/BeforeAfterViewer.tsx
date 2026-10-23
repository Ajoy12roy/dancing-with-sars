'use client';

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  MouseEvent as ReactMouseEvent,
  TouchEvent as ReactTouchEvent,
} from 'react';
import Image from 'next/image';
import {
  motion,
  useMotionValue,
  useTransform,
  useReducedMotion,
  animate,
} from 'framer-motion';
import { DataPanel } from '@/components/ui/DataPanel';

interface BeforeAfterViewerProps {
  beforeImage: string;
  afterImage: string;
  changeMapImage: string;
  dateBefore?: string;
  dateAfter?: string;
}

const SWEEP_DURATION_SECONDS = 8;

export default function BeforeAfterViewer({
  beforeImage,
  afterImage,
  changeMapImage,
  dateBefore,
  dateAfter,
}: BeforeAfterViewerProps) {
  const shouldReduceMotion = useReducedMotion();
  const [isPlaying, setIsPlaying] = useState(!shouldReduceMotion);
  const [isDragging, setIsDragging] = useState(false);
  const [showChangeMap, setShowChangeMap] = useState(true);
  const [displayPosition, setDisplayPosition] = useState(50);

  const [prevBeforeImage, setPrevBeforeImage] = useState(beforeImage);
  const [beforeError, setBeforeError] = useState(false);
  if (beforeImage !== prevBeforeImage) {
    setPrevBeforeImage(beforeImage);
    setBeforeError(false);
  }

  const [prevAfterImage, setPrevAfterImage] = useState(afterImage);
  const [afterError, setAfterError] = useState(false);
  if (afterImage !== prevAfterImage) {
    setPrevAfterImage(afterImage);
    setAfterError(false);
  }

  const [prevChangeMapImage, setPrevChangeMapImage] = useState(changeMapImage);
  const [changeMapError, setChangeMapError] = useState(false);
  if (changeMapImage !== prevChangeMapImage) {
    setPrevChangeMapImage(changeMapImage);
    setChangeMapError(false);
  }

  // Recolor changeMapImage at render time via canvas to #D7301F (change red)
  const [recoloredChangeMapUrl, setRecoloredChangeMapUrl] = useState<string | null>(null);

  const [prevChangeMapForRecolor, setPrevChangeMapForRecolor] = useState(changeMapImage);
  if (changeMapImage !== prevChangeMapForRecolor) {
    setPrevChangeMapForRecolor(changeMapImage);
    if (!changeMapImage) {
      setRecoloredChangeMapUrl(null);
    }
  }

  useEffect(() => {
    if (!changeMapImage) return;

    let isCancelled = false;
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.src = changeMapImage;

    img.onload = () => {
      if (isCancelled) return;
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;

        // Recolor changed pixels to #D7301F (R: 215, G: 48, B: 31)
        for (let i = 0; i < data.length; i += 4) {
          const a = data[i + 3];
          if (a === undefined || a === 0) continue;
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          if (r === undefined || g === undefined || b === undefined) continue;

          // Check if this pixel is marked as changed: reddish hazard hue (#A8462E in python-service)
          const isChanged = r > 130 && r > g * 1.3 && r > b * 1.3;
          if (isChanged) {
            data[i] = 215;     // #D7
            data[i + 1] = 48;  // #30
            data[i + 2] = 31;  // #1F
            data[i + 3] = 255;
          } else {
            // Non-change pixels (persistent water, etc.) stay transparent in Before/After comparison
            data[i + 3] = 0;
          }
        }

        ctx.putImageData(imgData, 0, 0);
        const dataUrl = canvas.toDataURL('image/png');
        if (!isCancelled) {
          setRecoloredChangeMapUrl(dataUrl);
        }
      } catch {
        if (!isCancelled) {
          setRecoloredChangeMapUrl(changeMapImage);
        }
      }
    };

    img.onerror = () => {
      if (!isCancelled) {
        setRecoloredChangeMapUrl(changeMapImage);
      }
    };

    return () => {
      isCancelled = true;
    };
  }, [changeMapImage]);

  const containerRef = useRef<HTMLDivElement>(null);
  const progress = useMotionValue(50);

  // Sync motion value changes to accessible numeric state for ARIA
  useEffect(() => {
    const unsubscribe = progress.on('change', (latest) => {
      setDisplayPosition(Math.round(latest));
    });
    return () => unsubscribe();
  }, [progress]);


  // Automatic scanning-line animation: 8s sweep left to right, then loops
  useEffect(() => {
    if (!isPlaying || shouldReduceMotion) return;

    let isCancelled = false;
    let loopControls: { stop: () => void } | null = null;

    const current = progress.get();
    const startPos = current >= 99.5 ? 0 : current;
    if (startPos === 0 && current !== 0) {
      progress.set(0);
    }

    const remainingFraction = (100 - startPos) / 100;
    const initialDuration = SWEEP_DURATION_SECONDS * Math.max(0.02, remainingFraction);

    const firstControls = animate(progress, 100, {
      duration: initialDuration,
      ease: 'easeInOut',
      onComplete: () => {
        if (isCancelled) return;
        progress.set(0);
        loopControls = animate(progress, [0, 100], {
          duration: SWEEP_DURATION_SECONDS,
          ease: 'easeInOut',
          repeat: Infinity,
          repeatType: 'loop',
        });
      },
    });

    return () => {
      isCancelled = true;
      firstControls.stop();
      if (loopControls) {
        loopControls.stop();
      }
    };
  }, [isPlaying, shouldReduceMotion, progress]);

  // Mouse / Touch Drag handler: dragging pauses autoplay
  const handleMove = useCallback(
    (clientX: number) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width <= 0) return;
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const percent = Math.max(0, Math.min((x / rect.width) * 100, 100));
      progress.set(percent);
    },
    [progress]
  );

  const startDrag = useCallback(
    (clientX: number) => {
      // Manual drag automatically pauses autoplay
      setIsPlaying(false);
      setIsDragging(true);
      handleMove(clientX);
    },
    [handleMove]
  );

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      handleMove(e.clientX);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isDragging) return;
      if (e.touches[0]) handleMove(e.touches[0].clientX);
    };

    const onMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      window.addEventListener('touchmove', onTouchMove);
      window.addEventListener('touchend', onMouseUp);
    } else {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onMouseUp);
    };
  }, [isDragging, handleMove]);

  // Clip path for revealing After + Change overlay on the left side of the line
  const clipPath = useTransform(
    progress,
    (v) => `inset(0 ${Math.max(0, Math.min(100, 100 - v))}% 0 0)`
  );

  // Position of scanning line from left
  const linePosition = useTransform(
    progress,
    (v) => `${Math.max(0, Math.min(100, v))}%`
  );

  const togglePlay = () => {
    setIsPlaying((prev) => !prev);
  };

  return (
    <DataPanel
      title="SAR Imagery Comparison"
      subtitle={
        shouldReduceMotion ? (
          <span className="text-[11px] font-sans text-(--color-text-secondary) hidden sm:inline">
            (Reduced motion: manual mode)
          </span>
        ) : undefined
      }
      rightSlot={
        <div className="flex items-center gap-4 shrink-0">
          {/* Play/Pause button (text button, no box styling, hidden when prefers-reduced-motion is set) */}
          {!shouldReduceMotion && (
            <button
              type="button"
              onClick={togglePlay}
              className="text-xs font-sans text-(--color-teal) hover:underline bg-transparent border-0 p-0 cursor-pointer font-medium"
              aria-label={isPlaying ? 'Pause sweep animation' : 'Play sweep animation'}
            >
              {isPlaying ? 'Pause sweep' : 'Play sweep'}
            </button>
          )}

          {/* Change Map overlay toggle (text button, no box styling) */}
          <button
            type="button"
            onClick={() => setShowChangeMap((prev) => !prev)}
            className="text-xs font-sans text-(--color-text-secondary) hover:text-(--color-ink) hover:underline bg-transparent border-0 p-0 cursor-pointer"
            aria-pressed={showChangeMap}
          >
            {showChangeMap ? 'Hide changes' : 'Show changes'}
          </button>
        </div>
      }
      className="h-130 xl:h-145 w-full select-none"
      noPadding
      footer={
        <div className="px-5 py-2.5 border-t border-(--color-hairline) bg-(--color-paper) shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          {/* Date captions: 14px, solid colors */}
          <div className="flex items-center gap-3 text-[14px] font-data">
            <div className="flex items-center gap-1.5 truncate">
              <span className="text-(--color-text-secondary)">Before:</span>
              <span className="text-(--color-ink) font-semibold">
                {dateBefore || 'Scene A'}
              </span>
            </div>
            <span className="text-(--color-hairline)" aria-hidden="true">|</span>
            <div className="flex items-center gap-1.5 truncate">
              <span className="text-(--color-text-secondary)">After:</span>
              <span className="text-(--color-ink) font-semibold">
                {dateAfter || 'Scene B'}
              </span>
            </div>
          </div>

          {/* Legend: #D7301F swatch labelled "Detected change" and blue line sample labelled "Comparison line" */}
          <div className="flex items-center gap-4 text-xs font-sans shrink-0">
            <div className="flex items-center gap-1.5">
              <span
                className="w-3.5 h-3.5 rounded-[2px] shrink-0 border border-black/10 dark:border-white/20"
                style={{ backgroundColor: '#D7301F' }}
                aria-hidden="true"
              />
              <span className="text-(--color-ink) font-medium text-xs">Detected change</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center justify-center w-3.5 h-3.5 shrink-0" aria-hidden="true">
                <span
                  className="h-full w-0.75 bg-[#0077CC] border-x border-white"
                  style={{ boxSizing: 'content-box' }}
                />
              </span>
              <span className="text-(--color-ink) font-medium text-xs">Comparison line</span>
            </div>
          </div>
        </div>
      }
    >
      {/* Viewer viewport (flex-1) */}
      <div
        ref={containerRef}
        className="relative flex-1 w-full bg-black overflow-hidden cursor-crosshair select-none"
        onMouseDown={(e: ReactMouseEvent) => {
          startDrag(e.clientX);
        }}
        onTouchStart={(e: ReactTouchEvent) => {
          if (e.touches[0]) startDrag(e.touches[0].clientX);
        }}
      >
        {/* Base Layer: Before Imagery (visible to the right of the scanning line) */}
        <div className="absolute inset-0">
          {beforeError ? (
            <div className="w-full h-full flex flex-col items-center justify-center bg-(--color-paper-dark) text-(--color-ink-dark) p-4 text-center">
              <span className="font-data text-sm tracking-wide font-semibold">
                Before Imagery
              </span>
              <span className="text-xs text-(--color-hairline) mt-1">
                SAR data placeholder
              </span>
            </div>
          ) : (
            <Image
              src={beforeImage}
              alt="Before"
              fill
              className="object-cover"
              priority
              unoptimized
              onError={() => setBeforeError(true)}
            />
          )}
        </div>

        {/* Revealed Layer (Left of the line): After Imagery + Detected Change Overlay */}
        <motion.div
          className="absolute inset-0 overflow-hidden pointer-events-none"
          style={{ clipPath }}
        >
          {/* After Imagery */}
          {afterError ? (
            <div className="w-full h-full flex flex-col items-center justify-center bg-(--color-paper-dark) text-(--color-ink-dark) p-4 text-center">
              <span className="font-data text-sm tracking-wide font-semibold">
                After Imagery
              </span>
              <span className="text-xs text-(--color-hairline) mt-1">
                SAR data placeholder
              </span>
            </div>
          ) : (
            <Image
              src={afterImage}
              alt="After"
              fill
              className="object-cover"
              priority
              unoptimized
              onError={() => setAfterError(true)}
            />
          )}

          {/* Detected Change Overlay (recolored to #D7301F at ~0.75 opacity) */}
          {showChangeMap && !changeMapError && (recoloredChangeMapUrl || changeMapImage) && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ opacity: 0.75 }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={recoloredChangeMapUrl || changeMapImage}
                alt="Detected Change"
                className="w-full h-full object-cover"
                onError={() => setChangeMapError(true)}
              />
            </div>
          )}
        </motion.div>

        {/* Comparison line: 3px solid #0077CC with a 1px solid #FFFFFF casing on each side, full height, no glow */}
        <motion.div
          className="absolute top-0 bottom-0 pointer-events-none z-20"
          style={{
            left: linePosition,
            transform: 'translateX(-50%)',
            width: '3px',
            backgroundColor: '#0077CC',
            borderLeft: '1px solid #FFFFFF',
            borderRight: '1px solid #FFFFFF',
            boxSizing: 'content-box',
          }}
        />

        {/* Draggable Handle on the line: 36px square, white fill, 1.5px #0077CC border, grip icon in #0077CC. No glow, no shadow */}
        <motion.div
          className="absolute top-0 bottom-0 pointer-events-none flex items-center justify-center z-30"
          style={{
            left: linePosition,
            transform: 'translateX(-50%)',
          }}
        >
          <div
            className="w-9 h-9 bg-[#FFFFFF] rounded-[2px] flex items-center justify-center pointer-events-auto cursor-ew-resize focus:outline-none focus:ring-1 focus:ring-[#0077CC] select-none"
            style={{
              border: '1.5px solid #0077CC',
              backgroundColor: '#FFFFFF',
              boxShadow: 'none',
            }}
            tabIndex={0}
            role="slider"
            aria-valuenow={displayPosition}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Scanning line comparison slider"
            onKeyDown={(e) => {
              setIsPlaying(false);
              const curr = progress.get();
              if (e.key === 'ArrowLeft') {
                const next = Math.max(0, curr - 5);
                progress.set(next);
              } else if (e.key === 'ArrowRight') {
                const next = Math.min(100, curr + 5);
                progress.set(next);
              } else if (e.key === 'Home') {
                progress.set(0);
              } else if (e.key === 'End') {
                progress.set(100);
              }
            }}
          >
            {/* Existing grip icon in #0077CC */}
            <div className="flex gap-1 pointer-events-none">
              <div className="w-0.5 h-3.5 bg-[#0077CC] rounded-[0.5px]"></div>
              <div className="w-0.5 h-3.5 bg-[#0077CC] rounded-[0.5px]"></div>
            </div>
          </div>
        </motion.div>

        {/* Floating Viewport Labels (Public Sans 14px weight 600, solid ink text, solid paper chip, 1px hairline border) */}
        <div
          className="absolute bottom-3 left-3 px-3 py-1 rounded-[2px] pointer-events-none z-10 select-none shadow-none"
          style={{
            fontFamily: 'var(--font-body)',
            fontWeight: 600,
            fontSize: '14px',
            lineHeight: 1.2,
            backgroundColor: 'var(--color-paper)',
            color: 'var(--color-ink)',
            border: '1px solid var(--color-hairline, #C7C4BC)',
          }}
        >
          After + Changes
        </div>
        <div
          className="absolute bottom-3 right-3 px-3 py-1 rounded-[2px] pointer-events-none z-10 select-none shadow-none"
          style={{
            fontFamily: 'var(--font-body)',
            fontWeight: 600,
            fontSize: '14px',
            lineHeight: 1.2,
            backgroundColor: 'var(--color-paper)',
            color: 'var(--color-ink)',
            border: '1px solid var(--color-hairline, #C7C4BC)',
          }}
        >
          Before
        </div>
      </div>

    </DataPanel>
  );
}
