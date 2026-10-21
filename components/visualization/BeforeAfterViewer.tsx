'use client';

import React, { useState, useRef, useEffect, MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent } from 'react';
import Image from 'next/image';

interface BeforeAfterViewerProps {
  beforeImage: string;
  afterImage: string;
  changeMapImage: string;
  dateBefore?: string;
  dateAfter?: string;
}

export default function BeforeAfterViewer({
  beforeImage,
  afterImage,
  changeMapImage,
  dateBefore,
  dateAfter,
}: BeforeAfterViewerProps) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [showChangeMap, setShowChangeMap] = useState(false);
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

  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = React.useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = Math.max(0, Math.min((x / rect.width) * 100, 100));
    setSliderPosition(percent);
  }, []);

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

  return (
    <div className="border border-(--color-hairline) bg-(--color-paper) rounded-[2px] flex flex-col h-130 xl:h-145 overflow-hidden w-full">
      {/* Header bar (h-12) */}
      <div className="h-12 px-4 border-b border-(--color-hairline) flex items-center justify-between bg-(--color-paper) shrink-0">
        <h3 className="font-bold font-headline text-base text-(--color-ink)">SAR Imagery Comparison</h3>
        <button
          type="button"
          className={`px-3 py-1 rounded-[2px] text-xs font-medium transition-colors border cursor-pointer ${
            showChangeMap 
              ? 'bg-(--color-teal) text-white border-(--color-teal) hover:bg-(--color-teal-light)' 
              : 'bg-transparent text-(--color-ink) border-(--color-hairline) hover:border-(--color-ink)'
          }`}
          onClick={() => setShowChangeMap(!showChangeMap)}
          aria-pressed={showChangeMap}
        >
          {showChangeMap ? 'Hide Change Map' : 'Show Change Map'}
        </button>
      </div>

      {/* Viewer viewport (flex-1) */}
      <div
        ref={containerRef}
        className="relative flex-1 w-full bg-black overflow-hidden cursor-crosshair select-none"
        onMouseDown={(e: ReactMouseEvent) => {
          setIsDragging(true);
          handleMove(e.clientX);
        }}
        onTouchStart={(e: ReactTouchEvent) => {
          setIsDragging(true);
          if (e.touches[0]) handleMove(e.touches[0].clientX);
        }}
      >
        {/* Background / After Image */}
        <div className="absolute inset-0">
          {afterError ? (
            <div className="w-full h-full flex flex-col items-center justify-center bg-(--color-paper-dark) text-(--color-ink-dark) p-4 text-center">
              <span className="font-data text-sm tracking-wide font-semibold">After Imagery</span>
              <span className="text-xs text-(--color-hairline) mt-1">SAR data placeholder</span>
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
        </div>

        {/* Change Map Overlay */}
        {showChangeMap && !changeMapError && (
          <div className="absolute inset-0 opacity-70 mix-blend-screen pointer-events-none">
            <Image
              src={changeMapImage}
              alt="Change Map"
              fill
              className="object-cover"
              unoptimized
              onError={() => setChangeMapError(true)}
            />
          </div>
        )}

        {/* Foreground / Before Image (clipped) */}
        <div
          className="absolute inset-0"
          style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
        >
          {beforeError ? (
            <div className="w-full h-full flex flex-col items-center justify-center bg-(--color-paper-dark) text-(--color-ink-dark) p-4 text-center">
              <span className="font-data text-sm tracking-wide font-semibold">Before Imagery</span>
              <span className="text-xs text-(--color-hairline) mt-1">SAR data placeholder</span>
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

        {/* Slider Handle */}
        <div
          className="absolute top-0 bottom-0 w-px bg-(--color-hairline) cursor-ew-resize flex items-center justify-center pointer-events-none"
          style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
        >
          <div 
            className="w-7 h-7 bg-(--color-paper) border border-(--color-hairline) rounded-[2px] flex items-center justify-center pointer-events-auto focus:outline-none focus:border-(--color-teal)"
            tabIndex={0}
            role="slider"
            aria-valuenow={sliderPosition}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Image comparison slider"
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft') {
                setSliderPosition((prev) => Math.max(0, prev - 5));
              } else if (e.key === 'ArrowRight') {
                setSliderPosition((prev) => Math.min(100, prev + 5));
              }
            }}
          >
            <div className="flex gap-1">
              <div className="w-px h-3 bg-(--color-ink)"></div>
              <div className="w-px h-3 bg-(--color-ink)"></div>
            </div>
          </div>
        </div>

        {/* Floating Viewport Labels */}
        <div className="absolute bottom-3 left-3 bg-(--color-paper) border border-(--color-hairline) text-(--color-ink) px-2 py-0.5 rounded-[2px] text-xs pointer-events-none font-medium">
          Before
        </div>
        <div className="absolute bottom-3 right-3 bg-(--color-paper) border border-(--color-hairline) text-(--color-ink) px-2 py-0.5 rounded-[2px] text-xs pointer-events-none font-medium">
          After
        </div>
      </div>

      {/* Footer bar (h-11) */}
      <div className="h-11 px-4 border-t border-(--color-hairline) flex items-center justify-between text-xs text-(--color-text-secondary) font-data bg-(--color-paper) shrink-0">
        <div className="flex items-center gap-1.5 truncate">
          <span className="text-(--color-text-secondary)">Before:</span>
          <span className="text-(--color-ink) font-medium">{dateBefore || 'Scene A'}</span>
        </div>
        <div className="flex items-center gap-1.5 truncate">
          <span className="text-(--color-text-secondary)">After:</span>
          <span className="text-(--color-ink) font-medium">{dateAfter || 'Scene B'}</span>
        </div>
      </div>
    </div>
  );
}
