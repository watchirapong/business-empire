'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import UserProfile from './UserProfile';

interface ExternalDiscordData {
  externalDiscordId: string;
  externalUsername: string;
  externalCoins: number;
  externalBalance: number;
  externalLevel: number;
  externalXp: number;
  lastUpdated: string;
  rawData: any;
  status?: string;
}

interface UnifiedPortfolio {
  discordId: string;
  username: string;
  cash: number;
  totalValue: number;
  stocks: Record<string, any>;
  cryptos: Record<string, any>;
  forexPositions: Record<string, any>;
  totalGainLoss: number;
  totalGainLossPercent: number;
  assetAllocation: {
    stocks: number;
    cryptos: number;
    forex: number;
    cash: number;
  };
}

interface UnifiedTradingDashboardProps {
  onBackToHome: () => void;
}

export default function UnifiedTradingDashboard({ onBackToHome }: UnifiedTradingDashboardProps) {
  const { data: session } = useSession();
  const [portfolio, setPortfolio] = useState<UnifiedPortfolio | null>(null);
  const [externalData, setExternalData] = useState<ExternalDiscordData | null>(null);
  const [loading, setLoading] = useState(false);
  const [externalLoading, setExternalLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'portfolio' | 'trading'>('portfolio');

  const loadPortfolio = async () => {
    if (!session?.user) return;

    setLoading(true);
    try {
      const response = await fetch('/api/unified-trading');
      const data = await response.json();
      
      if (response.ok && data && !data.error) {
        // The API returns the portfolio directly, not wrapped in success/portfolio
        setPortfolio(data);
        console.log('Portfolio loaded:', data);
      } else {
        console.error('Error loading portfolio:', data.error);
        setMessage('Failed to load portfolio');
      }
    } catch (error) {
      console.error('Error loading portfolio:', error);
      setMessage('Failed to load portfolio');
    } finally {
      setLoading(false);
    }
  };

  const loadExternalDiscordData = async () => {
    if (!session?.user) return;

    setExternalLoading(true);
    try {
      const response = await fetch('/api/external-discord');
      const data = await response.json();
      
      if (response.ok && data.success) {
        setExternalData(data.data);
        console.log('External Discord data loaded:', data.data);
      } else {
        console.error('Error loading external Discord data:', data.error);
        // Don't show error message for external data as it's optional
      }
    } catch (error) {
      console.error('Error loading external Discord data:', error);
      // Don't show error message for external data as it's optional
    } finally {
      setExternalLoading(false);
    }
  };

  useEffect(() => {
    loadPortfolio();
    loadExternalDiscordData();
  }, [session, loadExternalDiscordData, loadPortfolio]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  // Calculate real-time asset allocation and total value
  const calculateAssetAllocation = () => {
    if (!portfolio) return { stocks: 0, cryptos: 0, forex: 0, cash: 0, totalValue: 0 };

    let stocksValue = 0;
    let cryptosValue = 0;
    let forexValue = 0;

    // Calculate stocks value
    if (portfolio.stocks && typeof portfolio.stocks === 'object') {
      Object.entries(portfolio.stocks).forEach(([symbol, holding]: [string, any]) => {
        stocksValue += holding.shares * holding.avgPrice;
      });
    }

    // Calculate cryptos value
    if (portfolio.cryptos && typeof portfolio.cryptos === 'object') {
      Object.entries(portfolio.cryptos).forEach(([symbol, holding]: [string, any]) => {
        cryptosValue += holding.quantity * holding.avgPrice;
      });
    }

    // Calculate forex value
    if (portfolio.forexPositions && typeof portfolio.forexPositions === 'object') {
      Object.entries(portfolio.forexPositions).forEach(([key, position]: [string, any]) => {
        forexValue += position.margin || 0;
      });
    }

    const totalValue = portfolio.cash + stocksValue + cryptosValue + forexValue;

    return {
      stocks: stocksValue,
      cryptos: cryptosValue,
      forex: forexValue,
      cash: portfolio.cash,
      totalValue: totalValue
    };
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-4">🔐 Authentication Required</h1>
          <p className="text-gray-300 mb-6">Please log in with your Discord account to access the trading dashboard.</p>
          <button
            onClick={onBackToHome}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">🎯 Unified Trading Dashboard</h1>
            <p className="text-blue-200">Trade stocks, forex, and crypto with shared capital</p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => {
                loadPortfolio();
                loadExternalDiscordData();
                setMessage('Portfolio and external data refreshed!');
                setTimeout(() => setMessage(''), 3000);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded flex items-center space-x-2"
            >
              <span>🔄</span>
              <span>Refresh</span>
            </button>
            <UserProfile />
            <button
              onClick={onBackToHome}
              className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
            >
              Back to Games
            </button>
          </div>
        </div>

        {/* Message Display */}
        {message && (
          <div className={`mb-4 p-4 rounded ${message.includes('successfully') ? 'bg-green-600' : 'bg-red-600'} text-white`}>
            {message}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-8">
            <div className="text-white text-xl">Loading portfolio...</div>
          </div>
        )}

        {/* Portfolio Summary */}
        {!loading && portfolio && (() => {
          const allocation = calculateAssetAllocation();
          const totalGainLoss = allocation.totalValue - 100000; // Starting amount
          const totalGainLossPercent = ((allocation.totalValue - 100000) / 100000) * 100;
          
          return (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
              <div className="bg-gray-800 p-4 rounded-lg">
                <h3 className="text-gray-400 text-sm">Total Value</h3>
                <p className="text-2xl font-bold text-white">{formatCurrency(allocation.totalValue)}</p>
                <p className={`text-sm ${totalGainLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatCurrency(totalGainLoss)} ({formatPercentage(totalGainLossPercent)})
                </p>
              </div>
              <div className="bg-gray-800 p-4 rounded-lg">
                <h3 className="text-gray-400 text-sm">Available Cash</h3>
                <p className="text-2xl font-bold text-white">{formatCurrency(portfolio.cash)}</p>
              </div>
              <div className="bg-gray-800 p-4 rounded-lg">
                <h3 className="text-gray-400 text-sm">Discord User</h3>
                <p className="text-lg font-bold text-white">{portfolio.username}</p>
                <p className="text-sm text-gray-400">ID: {portfolio.discordId}</p>
              </div>
              <div className="bg-gray-800 p-4 rounded-lg">
                <h3 className="text-gray-400 text-sm">Asset Allocation</h3>
                <p className="text-sm text-white">Stocks: {formatCurrency(allocation.stocks)}</p>
                <p className="text-sm text-white">Crypto: {formatCurrency(allocation.cryptos)}</p>
                <p className="text-sm text-white">Forex: {formatCurrency(allocation.forex)}</p>
              </div>
              <div className="bg-gradient-to-br from-yellow-800/50 to-orange-800/50 border border-yellow-500/30 p-4 rounded-lg">
                <h3 className="text-yellow-200 text-sm font-semibold">External Discord</h3>
                {externalLoading ? (
                  <p className="text-yellow-300 text-sm">Loading...</p>
                ) : externalData ? (
                  <div>
                    {externalData.status === 'user_not_found' ? (
                      <div>
                        <p className="text-yellow-400 font-bold text-lg">🪙 0</p>
                        <p className="text-yellow-300 text-xs">User not in external system</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-yellow-400 font-bold text-lg">🪙 {formatNumber(externalData.externalCoins)}</p>
                        <p className="text-yellow-300 text-sm">Level {externalData.externalLevel}</p>
                        <p className="text-yellow-300 text-xs">XP: {formatNumber(externalData.externalXp)}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-yellow-300 text-sm">Not available</p>
                )}
              </div>
            </div>
          );
        })()}

        {/* Navigation Tabs */}
        <div className="flex space-x-1 mb-6 bg-gray-800 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('portfolio')}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
              activeTab === 'portfolio' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white'
            }`}
          >
            📊 Portfolio
          </button>
          <button
            onClick={() => setActiveTab('trading')}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
              activeTab === 'trading' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white'
            }`}
          >
            💹 Trading
          </button>
        </div>

        {/* Portfolio Tab */}
        {activeTab === 'portfolio' && !loading && portfolio && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Asset Allocation */}
            <div className="bg-gray-800 p-6 rounded-lg">
              <h3 className="text-xl font-bold text-white mb-4">Asset Allocation</h3>
              <div className="space-y-3">
                {(() => {
                  const allocation = calculateAssetAllocation();
                  return (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Stocks</span>
                        <span className="text-white font-medium">{formatCurrency(allocation.stocks)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Cryptocurrencies</span>
                        <span className="text-white font-medium">{formatCurrency(allocation.cryptos)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Forex</span>
                        <span className="text-white font-medium">{formatCurrency(allocation.forex)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Cash</span>
                        <span className="text-white font-medium">{formatCurrency(allocation.cash)}</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Holdings */}
            <div className="bg-gray-800 p-6 rounded-lg">
              <h3 className="text-xl font-bold text-white mb-4">Current Holdings</h3>
              <div className="space-y-4 max-h-64 overflow-y-auto">
                {/* Stock Holdings */}
                {portfolio.stocks && typeof portfolio.stocks === 'object' && 
                 Object.entries(portfolio.stocks).map(([symbol, holding]: [string, any]) => (
                  <div key={`stock-${symbol}`} className="flex justify-between items-center p-2 bg-gray-700 rounded">
                    <div>
                      <span className="text-white font-medium">{symbol}</span>
                      <p className="text-sm text-gray-400">{holding.shares} shares @ {formatCurrency(holding.avgPrice)}</p>
                    </div>
                    <span className="text-white">{formatCurrency(holding.shares * holding.avgPrice)}</span>
                  </div>
                ))}

                {/* Crypto Holdings */}
                {portfolio.cryptos && typeof portfolio.cryptos === 'object' && 
                 Object.entries(portfolio.cryptos).map(([symbol, holding]: [string, any]) => (
                  <div key={`crypto-${symbol}`} className="flex justify-between items-center p-2 bg-gray-700 rounded">
                    <div>
                      <span className="text-white font-medium">{symbol}</span>
                      <p className="text-sm text-gray-400">{holding.quantity.toFixed(4)} @ {formatCurrency(holding.avgPrice)}</p>
                    </div>
                    <span className="text-white">{formatCurrency(holding.quantity * holding.avgPrice)}</span>
                  </div>
                ))}

                {/* Forex Positions */}
                {portfolio.forexPositions && typeof portfolio.forexPositions === 'object' && 
                 Object.entries(portfolio.forexPositions).map(([key, position]: [string, any]) => (
                  <div key={`forex-${key}`} className="flex justify-between items-center p-2 bg-gray-700 rounded">
                    <div>
                      <span className="text-white font-medium">{position.symbol} ({position.type})</span>
                      <p className="text-sm text-gray-400">{position.size.toLocaleString()} @ {formatCurrency(position.avgPrice)}</p>
                    </div>
                    <span className="text-white">{formatCurrency(position.margin)}</span>
                  </div>
                ))}

                {(!portfolio.stocks || Object.keys(portfolio.stocks).length === 0) && 
                 (!portfolio.cryptos || Object.keys(portfolio.cryptos).length === 0) && 
                 (!portfolio.forexPositions || Object.keys(portfolio.forexPositions).length === 0) && (
                  <p className="text-gray-400 text-center">No holdings yet. Start trading!</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Trading Tab */}
        {activeTab === 'trading' && (
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-xl font-bold text-white mb-4">Trading Interface</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <h4 className="text-lg font-semibold text-white mb-2">📈 Stock Trading</h4>
                <p className="text-gray-400 mb-4">Trade popular stocks with real-time data</p>
                <button
                  onClick={() => window.location.href = '/games/stock-trading'}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                >
                  Trade Stocks
                </button>
              </div>
              
              <div className="text-center">
                <h4 className="text-lg font-semibold text-white mb-2">🪙 Crypto Trading</h4>
                <p className="text-gray-400 mb-4">Buy and sell cryptocurrencies</p>
                <button
                  onClick={() => window.location.href = '/games/crypto-trading'}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
                >
                  Trade Crypto
                </button>
              </div>
              
              <div className="text-center">
                <h4 className="text-lg font-semibold text-white mb-2">💱 Forex Trading</h4>
                <p className="text-gray-400 mb-4">Trade currency pairs with leverage</p>
                <button
                  onClick={() => window.location.href = '/games/forex-trading'}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
                >
                  Trade Forex
                </button>
              </div>
            </div>
            
            <div className="mt-8 p-4 bg-gray-700 rounded-lg">
              <h4 className="text-white font-semibold mb-2">💡 How it works:</h4>
              <ul className="text-gray-300 text-sm space-y-1">
                <li>• All trading types share the same cash balance</li>
                <li>• Your Discord account is linked to your portfolio</li>
                <li>• Real-time market data updates your holdings</li>
                <li>• Track performance across all asset classes</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
