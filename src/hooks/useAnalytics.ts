'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';

export function useAnalytics() {
  const { data: session } = useSession();
  const pathname = usePathname();

  useEffect(() => {
    // Only track if user is logged in
    if (!session?.user) return;

    // Generate a session ID for this browser session
    const getSessionId = () => {
      let sessionId = sessionStorage.getItem('analytics_session_id');
      if (!sessionId) {
        sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        sessionStorage.setItem('analytics_session_id', sessionId);
      }
      return sessionId;
    };

    const trackVisit = async () => {
      try {
        const sessionId = getSessionId();
        
        await fetch('/api/analytics/track-visit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: (session.user as any).id,
            username: (session.user as any).name || (session.user as any).username,
            globalName: (session.user as any).globalName,
            avatar: (session.user as any).image,
            page: pathname,
            sessionId,
            userAgent: navigator.userAgent,
            referrer: document.referrer,
          }),
        });
      } catch (error) {
        console.error('Failed to track visit:', error);
      }
    };

    // Track the visit
    trackVisit();
  }, [session, pathname]);
}

export default useAnalytics;
