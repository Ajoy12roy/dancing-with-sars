'use client';

import React, { useState, useRef, useEffect, MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent } from 'react';
import Image from 'next/image';

interface BeforeAfterViewerProps {
  beforeImage: string;
  afterImage: string;
  changeMapImage: string;
}

export default function BeforeAfterViewer({
  beforeImage,
  afterImage,
  changeMapImage,
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
    <div className="relative w-full flex flex-col gap-4">
      <div className="flex justify-between items-center bg-transparent border border-(--color-hairline) border-b-0 text-(--color-ink) p-3 rounded-none">
        <h3 className="font-bold text-lg">SAR Imagery Comparison</h3>
        <button
          className={`px-3 py-1 rounded-none text-sm transition-colors border ${
            showChangeMap 
              ? 'bg-(--color-teal) text-white border-(--color-teal) hover:bg-(--color-teal-light)' 
              : 'bg-transparent text-(--color-ink) border-(--color-hairline) hover:border-(--color-ink) hover:text-(--color-ink)'
          }`}
          onClick={() => setShowChangeMap(!showChangeMap)}
          aria-pressed={showChangeMap}
        >
          {showChangeMap ? 'Hide Change Map' : 'Show Change Map'}
        </button>
      </div>

      <div
        ref={containerRef}
        className="relative w-full h-[45vh] xl:h-[60vh] min-h-100 max-h-200 bg-black rounded-none overflow-hidden cursor-crosshair border border-(--color-hairline)"
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
              <span className="font-data text-sm tracking-wide uppercase font-semibold">After Imagery</span>
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

        {/* Change Map Overlay (conditionally shown over After image) */}
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
              <span className="font-data text-sm tracking-wide uppercase font-semibold">Before Imagery</span>
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
            className="w-8 h-8 bg-(--color-paper) border border-(--color-hairline) rounded-none flex items-center justify-center pointer-events-auto focus:outline-none focus:ring-2 focus:ring-(--color-teal)"
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

        {/* Labels */}
        <div className="absolute bottom-4 left-4 bg-(--color-paper) border border-(--color-hairline) text-(--color-ink) px-2 py-1 rounded-none text-sm pointer-events-none font-bold">
          Before
        </div>
        <div className="absolute bottom-4 right-4 bg-(--color-paper) border border-(--color-hairline) text-(--color-ink) px-2 py-1 rounded-none text-sm pointer-events-none font-bold">
          After
        </div>
      </div>
    </div>
  );
}
