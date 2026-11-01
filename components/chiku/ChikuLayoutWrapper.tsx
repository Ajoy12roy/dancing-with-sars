'use client';

import { usePathname } from 'next/navigation';
import { ChikuGuide } from './ChikuGuide';

const ALLOWED_ROUTES = ['/', '/explore', '/how-it-works', '/data-sources'];

export function ChikuLayoutWrapper() {
  const pathname = usePathname();

  if (!ALLOWED_ROUTES.includes(pathname)) {
    return null;
  }

  return <ChikuGuide />;
}
