'use client';

import { useState, useEffect } from 'react';

interface MarketStatus {
  isOpen: boolean;
  status: 'pre-market' | 'open' | 'after-hours' | 'closed';
  nextOpenTime: Date | null;
  nextCloseTime: Date | null;
  timeUntilNext: string;
}

export default function NasdaqTimer() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [marketStatus, setMarketStatus] = useState<MarketStatus>({
    isOpen: false,
    status: 'closed',
    nextOpenTime: null,
    nextCloseTime: null,
    timeUntilNext: '',
  });

  // NASDAQ trading hours (Eastern Time)
  const MARKET_OPEN_HOUR = 9;
  const MARKET_OPEN_MINUTE = 30;
  const MARKET_CLOSE_HOUR = 16;
  const MARKET_CLOSE_MINUTE = 0;
  const PRE_MARKET_START_HOUR = 4;
  const AFTER_HOURS_END_HOUR = 20;

  const getMarketStatus = (now: Date): MarketStatus => {
    // Convert to Eastern Time
    const easternTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
    const day = easternTime.getDay(); // 0 = Sunday, 6 = Saturday
    const hour = easternTime.getHours();
    const minute = easternTime.getMinutes();
    const currentMinutes = hour * 60 + minute;
    
    // Market is closed on weekends
    const isWeekend = day === 0 || day === 6;
    
    const marketOpenMinutes = MARKET_OPEN_HOUR * 60 + MARKET_OPEN_MINUTE; // 9:30 AM
    const marketCloseMinutes = MARKET_CLOSE_HOUR * 60 + MARKET_CLOSE_MINUTE; // 4:00 PM
    const preMarketStartMinutes = PRE_MARKET_START_HOUR * 60; // 4:00 AM
    const afterHoursEndMinutes = AFTER_HOURS_END_HOUR * 60; // 8:00 PM

    let status: MarketStatus['status'] = 'closed';
    let isOpen = false;
    let nextOpenTime: Date | null = null;
    let nextCloseTime: Date | null = null;

    if (!isWeekend) {
      if (currentMinutes >= preMarketStartMinutes && currentMinutes < marketOpenMinutes) {
        status = 'pre-market';
      } else if (currentMinutes >= marketOpenMinutes && currentMinutes < marketCloseMinutes) {
        status = 'open';
        isOpen = true;
      } else if (currentMinutes >= marketCloseMinutes && currentMinutes < afterHoursEndMinutes) {
        status = 'after-hours';
      } else {
        status = 'closed';
      }
    }

    // Calculate next open/close times
    const today = new Date(easternTime);
    today.setHours(0, 0, 0, 0);

    if (isOpen) {
      // Market is open, next event is close
      nextCloseTime = new Date(today);
      nextCloseTime.setHours(MARKET_CLOSE_HOUR, MARKET_CLOSE_MINUTE, 0, 0);
    } else {
      // Market is closed, next event is open
      const nextOpenDay = new Date(today);
      
      if (isWeekend || currentMinutes >= afterHoursEndMinutes) {
        // Move to next weekday
        do {
          nextOpenDay.setDate(nextOpenDay.getDate() + 1);
        } while (nextOpenDay.getDay() === 0 || nextOpenDay.getDay() === 6);
      }
      
      nextOpenTime = new Date(nextOpenDay);
      nextOpenTime.setHours(MARKET_OPEN_HOUR, MARKET_OPEN_MINUTE, 0, 0);
    }

    // Calculate time until next event
    const nextEventTime = isOpen ? nextCloseTime : nextOpenTime;
    const timeUntilNext = nextEventTime ? formatTimeUntil(now, nextEventTime) : '';

    return {
      isOpen,
      status,
      nextOpenTime,
      nextCloseTime,
      timeUntilNext,
    };
  };

  const formatTimeUntil = (now: Date, target: Date): string => {
    const diff = target.getTime() - now.getTime();
    if (diff <= 0) return '00:00:00';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      return `${days}d ${remainingHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      setCurrentTime(now);
      setMarketStatus(getMarketStatus(now));
    };

    // Update immediately
    updateTimer();

    // Update every second
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: MarketStatus['status']) => {
    switch (status) {
      case 'open':
        return 'text-green-400 bg-green-900/30 border-green-500/50';
      case 'pre-market':
        return 'text-yellow-400 bg-yellow-900/30 border-yellow-500/50';
      case 'after-hours':
        return 'text-orange-400 bg-orange-900/30 border-orange-500/50';
      case 'closed':
        return 'text-red-400 bg-red-900/30 border-red-500/50';
      default:
        return 'text-gray-400 bg-gray-900/30 border-gray-500/50';
    }
  };

  const getStatusIcon = (status: MarketStatus['status']) => {
    switch (status) {
      case 'open':
        return '🟢';
      case 'pre-market':
        return '🟡';
      case 'after-hours':
        return '🟠';
      case 'closed':
        return '🔴';
      default:
        return '⚪';
    }
  };

  const getStatusText = (status: MarketStatus['status']) => {
    switch (status) {
      case 'open':
        return 'Market Open';
      case 'pre-market':
        return 'Pre-Market';
      case 'after-hours':
        return 'After Hours';
      case 'closed':
        return 'Market Closed';
      default:
        return 'Unknown';
    }
  };

  const easternTime = currentTime.toLocaleString("en-US", {
    timeZone: "America/New_York",
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-blue-300 flex items-center">
          🏛️ NASDAQ Market Status
        </h3>
        <div className="text-sm text-gray-300">
          ET: {easternTime}
        </div>
      </div>
      
      <div className="space-y-3">
        {/* Market Status */}
        <div className={`flex items-center justify-between p-3 rounded-lg border ${getStatusColor(marketStatus.status)}`}>
          <div className="flex items-center space-x-2">
            <span className="text-xl">{getStatusIcon(marketStatus.status)}</span>
            <span className="font-semibold">{getStatusText(marketStatus.status)}</span>
          </div>
          {marketStatus.isOpen && (
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm">LIVE</span>
            </div>
          )}
        </div>

        {/* Countdown Timer */}
        <div className="bg-white/5 rounded-lg p-3 border border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">
              {marketStatus.isOpen ? 'Market closes in:' : 'Market opens in:'}
            </span>
            <span className="font-mono text-lg font-bold text-white">
              {marketStatus.timeUntilNext}
            </span>
          </div>
        </div>

        {/* Trading Hours Info */}
        <div className="text-xs text-gray-400 space-y-1">
          <div className="flex justify-between">
            <span>Regular Hours:</span>
            <span>9:30 AM - 4:00 PM ET</span>
          </div>
          <div className="flex justify-between">
            <span>Pre-Market:</span>
            <span>4:00 AM - 9:30 AM ET</span>
          </div>
          <div className="flex justify-between">
            <span>After Hours:</span>
            <span>4:00 PM - 8:00 PM ET</span>
          </div>
        </div>
      </div>
    </div>
  );
}
