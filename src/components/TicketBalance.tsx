'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface TicketData {
  balance: number;
  totalEarned: number;
  totalSpent: number;
  lastTicketEarned: string | null;
}

export default function TicketBalance() {
  const { data: session } = useSession();
  const [ticketData, setTicketData] = useState<TicketData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.user) {
      fetchTicketBalance();
    }
  }, [session]);

  const fetchTicketBalance = async () => {
    try {
      const response = await fetch('/api/tickets');
      const data = await response.json();
      
      if (data.success) {
        setTicketData(data.data);
      }
    } catch (error) {
      console.error('Error fetching ticket balance:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!session?.user || loading) {
    return (
      <div className="bg-gradient-to-br from-yellow-900/50 to-orange-900/50 backdrop-blur-sm rounded-2xl border border-yellow-500/20 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700/50 rounded mb-4"></div>
          <div className="h-4 bg-gray-700/50 rounded mb-2"></div>
          <div className="h-4 bg-gray-700/50 rounded mb-2"></div>
        </div>
      </div>
    );
  }

  if (!ticketData) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-yellow-900/50 to-orange-900/50 backdrop-blur-sm rounded-2xl border border-yellow-500/20 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-white flex items-center">
          <span className="mr-2">🎫</span>
          Gacha Tickets
        </h3>
        <div className="text-yellow-300 text-sm">
          Earned: {ticketData.totalEarned}
        </div>
      </div>

      {/* Ticket Balance Display */}
      <div className="text-center mb-4">
        <div className="text-4xl font-black bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent mb-2">
          {ticketData.balance}
        </div>
        <div className="text-white font-medium">
          {ticketData.balance === 1 ? 'Ticket' : 'Tickets'} Available
        </div>
      </div>

      {/* How to Earn */}
      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 mb-4">
        <div className="text-yellow-300 text-sm font-medium mb-2">
          💡 How to earn rewards:
        </div>
        <div className="space-y-1">
          <div className="text-yellow-200 text-xs">
            🎫 <strong>Tickets:</strong> Complete daily voice reward (15+ minutes) to earn 1 ticket
          </div>
          <div className="text-yellow-200 text-xs">
            💰 <strong>Coins:</strong> Complete 3 consecutive days of voice rewards to earn 10 coins per day
          </div>
        </div>
      </div>

      {/* Usage Info */}
      <div className="text-center text-gray-400 text-xs">
        Use tickets to pull from gacha and get exclusive rewards!
      </div>
    </div>
  );
}
