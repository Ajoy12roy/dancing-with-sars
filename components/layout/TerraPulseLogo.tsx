"use client";

import { useRef } from "react";
import { useAnimationFrame, useReducedMotion } from "framer-motion";

/**
 * TerraPulse logo — globe + orbiting satellite + wordmark.
 * Layers (all transparent PNG in /public/brand):
 *   globe (satellite removed) -> satellite (moves on a tilted ellipse) -> wordmark
 * The satellite passes BEHIND the globe on the far side of the orbit and IN FRONT on the near side.
 */

// Geometry in the globe image's own pixel space (638 x 610)
const G_W = 638;
const G_H = 610;
const CX = 330; // globe centre x
const CY = 302; // globe centre y
const ORBIT_A = 318; // semi-major axis
const ORBIT_B = 108; // semi-minor axis
const TILT = (-22 * Math.PI) / 180; // same tilt as the glowing ring
const SAT_W = 231;
const SAT_H = 155;
const START = 0.12 * Math.PI; // near side, on the ring: fully visible (also used when reduced-motion)

type Props = {
  /** height of the globe mark in px */
  size?: number;
  /** show wordmark next to the globe */
  showWordmark?: boolean;
  /** show tagline under the wordmark (use only for large sizes, e.g. hero/footer) */
  showTagline?: boolean;
  /** wordmark height as a fraction of globe height (0.4 for navbar, 0.18 = original lockup proportion) */
  wordmarkRatio?: number;
  /** seconds for one full orbit */
  period?: number;
  /** satellite size relative to the original artwork */
  satScale?: number;
  /** wordmark tone: "auto" (theme-adaptive) or "dark" (always white wordmark) */
  tone?: "auto" | "dark";
  className?: string;
};

export default function TerraPulseLogo({
  size = 56,
  showWordmark = true,
  showTagline = false,
  wordmarkRatio = 0.4,
  period = 14,
  satScale = 0.7,
  tone = "dark",
  className = "",
}: Props) {
  const reduce = useReducedMotion();
  const backRef = useRef<HTMLImageElement>(null);
  const frontRef = useRef<HTMLImageElement>(null);

  const k = size / G_H; // px per artwork unit
  const markW = G_W * k;

  const place = (theta: number) => {
    const ex = ORBIT_A * Math.cos(theta);
    const ey = ORBIT_B * Math.sin(theta);
    const x = CX + ex * Math.cos(TILT) - ey * Math.sin(TILT);
    const y = CY + ex * Math.sin(TILT) + ey * Math.cos(TILT);
    const depth = Math.sin(theta); // >0 = near side (in front of globe)
    const s = satScale * (0.85 + 0.15 * depth);
    const w = SAT_W * s * k;
    const h = SAT_H * s * k;
    return { left: x * k - w / 2, top: y * k - h / 2, w, h, depth };
  };

  const apply = (theta: number) => {
    const p = place(theta);
    const front = p.depth > 0;
    const on = front ? frontRef.current : backRef.current;
    const off = front ? backRef.current : frontRef.current;
    if (off) off.style.opacity = "0";
    if (on) {
      on.style.opacity = "1";
      on.style.width = `${p.w}px`;
      on.style.height = `${p.h}px`;
      on.style.transform = `translate(${p.left}px, ${p.top}px)`;
    }
  };

  useAnimationFrame((t) => {
    if (reduce) return apply(START);
    apply(START + ((t / 1000) / period) * Math.PI * 2);
  });

  const imgBase: React.CSSProperties = {
    position: "absolute",
    left: 0,
    top: 0,
    opacity: 0,
    pointerEvents: "none",
    willChange: "transform",
  };

  const wmH = size * wordmarkRatio;
  const wmW = wmH * (2277 / 217);

  return (
    <span
      className={`tp-logo ${tone === "auto" ? "tp-tone-auto" : "tp-tone-dark"} ${className}`.trim()}
      data-tone={tone}
      style={{ display: "inline-flex", alignItems: "center", gap: size * 0.18 }}
      role="img"
      aria-label="TerraPulse"
    >
      <span style={{ position: "relative", width: markW, height: size, flex: "none" }}>
        {/* far side: under the globe */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img ref={backRef} src="/brand/terrapulse-satellite.png" alt="" style={{ ...imgBase, zIndex: 0 }} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/terrapulse-globe.png"
          alt=""
          width={markW}
          height={size}
          style={{ position: "absolute", inset: 0, zIndex: 1 }}
        />
        {/* near side: over the globe */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img ref={frontRef} src="/brand/terrapulse-satellite.png" alt="" style={{ ...imgBase, zIndex: 2 }} />
      </span>

      {showWordmark && (
        <span
          className={`tp-wordmark ${tone === "auto" ? "tp-tone-auto" : "tp-tone-dark"}`}
          data-tone={tone}
          style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: wmH * 0.35 }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/terrapulse-wordmark.png"
            alt=""
            width={wmW}
            height={wmH}
            className="tp-wm-dark"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/terrapulse-wordmark-light.png"
            alt=""
            width={wmW}
            height={wmH}
            className="tp-wm-light"
          />
          {showTagline && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src="/brand/terrapulse-tagline.png"
              alt=""
              width={wmW * 0.78}
              height={(wmW * 0.78) * (45 / 1787)}
              style={{ display: "block" }}
            />
          )}
        </span>
      )}
    </span>
  );
}
