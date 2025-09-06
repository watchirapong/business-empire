'use client';

import { useAnalytics } from '@/hooks/useAnalytics';

export default function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  // Automatically track analytics on all pages
  useAnalytics();

  return <>{children}</>;
}
