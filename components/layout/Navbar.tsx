'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import TerraPulseLogo from '@/components/layout/TerraPulseLogo';
import { NAV_LINKS } from '@/constants';

interface NavLinkProps {
  href: string;
  label: string;
  isActive: boolean;
}

function NavLink({ href, label, isActive }: NavLinkProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <Link
      href={href}
      className="relative inline-flex items-center text-xs lg:text-sm font-semibold select-none py-1 focus:outline-none"
      style={{
        fontFamily: 'var(--font-body)',
        fontWeight: 600,
      }}
    >
      <motion.span
        className="relative inline-block overflow-hidden leading-tight"
        initial="rest"
        whileHover={shouldReduceMotion ? undefined : 'hover'}
        whileFocus={shouldReduceMotion ? undefined : 'hover'}
        animate="rest"
      >
        {/* Top copy — slides up and out on hover */}
        <motion.span
          className="block"
          style={{ color: isActive ? '#7FD6E3' : '#EAF3FB' }}
          variants={{
            rest: { y: 0 },
            hover: { y: '-100%' },
          }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          {label}
        </motion.span>
        {/* Bottom copy — slides up in on hover */}
        <motion.span
          className="absolute inset-0 block text-[#7FD6E3]"
          variants={{
            rest: { y: '100%' },
            hover: { y: 0 },
          }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          aria-hidden="true"
        >
          {label}
        </motion.span>
      </motion.span>
    </Link>
  );
}

function parseMode(param: string | null): string {
  if (!param) return 'flood';
  if (param === 'erosion' || param === 'river-erosion') return 'erosion';
  if (param === 'deforestation') return 'deforestation';
  if (param === 'water' || param === 'surface-water') return 'water';
  return 'flood';
}

function isLinkActive(linkHref: string, pathname: string, currentMode: string | null): boolean {
  if (linkHref === '/') {
    return pathname === '/';
  }
  if (linkHref.startsWith('/explore')) {
    if (pathname !== '/explore') return false;
    const url = new URL(linkHref, 'http://localhost');
    const targetMode = url.searchParams.get('mode');
    const activeMode = parseMode(currentMode);
    return targetMode === activeMode;
  }
  return pathname === linkHref;
}

function NavbarContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mobileOpen, setMobileOpen] = useState(false);
  const currentMode = pathname === '/explore' ? searchParams.get('mode') : null;

  return (
    <header
      className="sticky top-0 z-50 w-full border-b border-[#12263A] bg-(--navy)"
      style={{ backgroundColor: 'var(--navy)', borderBottomColor: '#12263A' }}
    >
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-15 md:h-18 flex items-center justify-between">
        {/* Far-left: TerraPulse Logo wrapped in Link to home */}
        <Link
          href="/"
          aria-label="TerraPulse — home"
          className="flex items-center shrink-0 focus:outline-none"
        >
          {/* Desktop logo: size 44 */}
          <div className="hidden md:flex items-center">
            <TerraPulseLogo size={44} />
          </div>
          {/* Mobile logo: size 36, wordmarkRatio 0.34 */}
          <div className="flex md:hidden items-center">
            <TerraPulseLogo size={36} wordmarkRatio={0.34} />
          </div>
        </Link>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-4 lg:gap-6 xl:gap-7">
          {NAV_LINKS.map((link) => {
            const isActive = isLinkActive(link.href, pathname, currentMode);
            return (
              <NavLink
                key={link.href}
                href={link.href}
                label={link.label}
                isActive={isActive}
              />
            );
          })}
        </nav>

        {/* Mobile Hamburger Toggle Button */}
        <div className="flex md:hidden items-center">
          <button
            type="button"
            className="p-2 text-[#EAF3FB] hover:text-[#7FD6E3] transition-colors cursor-pointer focus:outline-none"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileOpen}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
            >
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
      </div>

      {/* Mobile Dropdown Menu (<768px) */}
      {mobileOpen && (
        <div
          className="md:hidden border-t border-[#12263A] bg-(--navy) w-full"
          style={{ backgroundColor: 'var(--navy)', borderTopColor: '#12263A' }}
        >
          <ul className="flex flex-col px-6 py-4 space-y-1">
            {NAV_LINKS.map((link) => {
              const isActive = isLinkActive(link.href, pathname, currentMode);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="block py-2.5 text-sm font-semibold transition-colors duration-150"
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontWeight: 600,
                      color: isActive ? '#7FD6E3' : '#EAF3FB',
                    }}
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

export function Navbar() {
  return (
    <Suspense
      fallback={
        <header
          className="sticky top-0 z-50 w-full border-b border-[#12263A] bg-(--navy) h-15 md:h-18"
          style={{ backgroundColor: 'var(--navy)', borderBottomColor: '#12263A' }}
        >
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
            <Link href="/" aria-label="TerraPulse — home" className="flex items-center shrink-0">
              <div className="hidden md:flex items-center">
                <TerraPulseLogo size={44} />
              </div>
              <div className="flex md:hidden items-center">
                <TerraPulseLogo size={36} wordmarkRatio={0.34} />
              </div>
            </Link>
          </div>
        </header>
      }
    >
      <NavbarContent />
    </Suspense>
  );
}
