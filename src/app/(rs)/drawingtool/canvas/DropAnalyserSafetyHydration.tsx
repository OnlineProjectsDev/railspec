'use client';
import { useEffect, useState } from 'react';

export function SafeHydration({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null; // avoid mismatched SSR render
  return <>{children}</>;
}