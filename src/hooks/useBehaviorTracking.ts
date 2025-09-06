'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';

interface TrackBehaviorOptions {
  behaviorType: 'shop_visit' | 'gacha_play' | 'university_visit' | 'hamsterboard_visit' | 'profile_visit' | 'admin_visit' | 'purchase' | 'gacha_win' | 'gacha_spend';
  section: 'shop' | 'gacha' | 'university' | 'hamsterboard' | 'profile' | 'admin' | 'home';
  action: string;
  details?: any;
}

export function useBehaviorTracking(options?: TrackBehaviorOptions) {
  const { data: session } = useSession();
  const pathname = usePathname();

  const trackBehavior = async (trackOptions: TrackBehaviorOptions) => {
    // Only track if user is logged in
    if (!session?.user) return;

    try {
      // Get session ID
      const getSessionId = () => {
        let sessionId = sessionStorage.getItem('analytics_session_id');
        if (!sessionId) {
          sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          sessionStorage.setItem('analytics_session_id', sessionId);
        }
        return sessionId;
      };

      await fetch('/api/analytics/track-behavior', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: (session.user as any).id,
          username: (session.user as any).name || (session.user as any).username,
          globalName: (session.user as any).globalName,
          avatar: (session.user as any).image,
          behaviorType: trackOptions.behaviorType,
          section: trackOptions.section,
          action: trackOptions.action,
          details: trackOptions.details || {},
          page: pathname,
          sessionId: getSessionId(),
        }),
      });
    } catch (error) {
      console.error('Failed to track behavior:', error);
    }
  };

  // Auto-track page visits based on pathname
  useEffect(() => {
    if (!session?.user || !options) return;

    const getSessionId = () => {
      let sessionId = sessionStorage.getItem('analytics_session_id');
      if (!sessionId) {
        sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        sessionStorage.setItem('analytics_session_id', sessionId);
      }
      return sessionId;
    };

    const autoTrack = async () => {
      try {
        await fetch('/api/analytics/track-behavior', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: (session.user as any).id,
            username: (session.user as any).name || (session.user as any).username,
            globalName: (session.user as any).globalName,
            avatar: (session.user as any).image,
            behaviorType: options.behaviorType,
            section: options.section,
            action: options.action,
            details: options.details || {},
            page: pathname,
            sessionId: getSessionId(),
          }),
        });
      } catch (error) {
        console.error('Failed to auto-track behavior:', error);
      }
    };

    autoTrack();
  }, [session, pathname, options]);

  return { trackBehavior };
}

export default useBehaviorTracking;
