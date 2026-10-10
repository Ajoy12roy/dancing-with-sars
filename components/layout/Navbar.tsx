// ========================================================================
// Navbar — Three-zone layout: logo left | nav centered | empty right.
// Uses grid-template-columns: 1fr auto 1fr so nav stays mathematically
// centered regardless of logo or future right-zone content width.
// Collapses to logo-left / hamburger-right below 640px (sm breakpoint).
// ========================================================================

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_LINKS, APP_CONFIG } from '@/constants';

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-(--color-hairline) bg-(--color-paper)">

      {/* Desktop: three-zone grid — logo | nav | (future right zone) */}
      <nav className="hidden sm:grid mx-auto max-w-5xl px-6 py-4"
           style={{ gridTemplateColumns: '1fr auto 1fr' }}>

        {/* Zone 1 — Logo, left-aligned */}
        <div className="flex items-center">
          <Link href="/" className="text-sm font-semibold font-headline text-(--color-text-primary) hover:text-(--color-teal) transition-colors">
            {APP_CONFIG.name}
          </Link>
        </div>

        {/* Zone 2 — Nav links, centered */}
        <ul className="flex items-center gap-6">
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href;
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`
                    text-sm transition-colors duration-150 pb-0.5
                    ${isActive
                      ? 'text-(--color-teal) border-b border-(--color-teal)'
                      : 'text-(--color-text-secondary) hover:text-(--color-text-primary)'
                    }
                  `}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Zone 3 — Reserved (theme toggle goes here in future) */}
        <div className="flex items-center justify-end">
          {/* placeholder — keeps grid symmetric */}
        </div>
      </nav>

      {/* Mobile: two-zone flex — logo left, hamburger right */}
      <div className="sm:hidden flex items-center justify-between px-6 py-4">
        <Link href="/" className="text-sm font-semibold font-headline text-(--color-text-primary)">
          {APP_CONFIG.name}
        </Link>
        <button
          className="p-1 text-(--color-text-secondary) hover:text-(--color-text-primary) transition-colors cursor-pointer"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle navigation menu"
          aria-expanded={mobileOpen}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
            {mobileOpen ? (
              <>
                <line x1="4" y1="4" x2="16" y2="16" />
                <line x1="16" y1="4" x2="4" y2="16" />
              </>
            ) : (
              <>
                <line x1="3" y1="5" x2="17" y2="5" />
                <line x1="3" y1="10" x2="17" y2="10" />
                <line x1="3" y1="15" x2="17" y2="15" />
              </>
            )}
          </svg>
        </button>
      </div>

      {/* Mobile dropdown menu */}
      {mobileOpen && (
        <div className="sm:hidden border-t border-(--color-hairline)">
          <ul className="flex flex-col px-6 py-3">
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href;
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={`
                      block py-2 text-sm transition-colors
                      ${isActive
                        ? 'text-(--color-teal)'
                        : 'text-(--color-text-secondary) hover:text-(--color-text-primary)'
                      }
                    `}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </header>
  );
}
