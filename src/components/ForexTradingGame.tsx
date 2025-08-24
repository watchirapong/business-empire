'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import UserProfile from './UserProfile';

interface ForexPair {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  spread: number;
  bid: number;
  ask: number;
}

interface Portfolio {
  cash: number;
  positions: Record<string, { size: number; avgPrice: number; type: 'buy' | 'sell' }>;
  totalValue: number;
}

interface ForexTradingGameProps {
  onBackToHome: () => void;
}

export default function ForexTradingGame({ onBackToHome }: ForexTradingGameProps) {
  const { data: session } = useSession();
  const [portfolio, setPortfolio] = useState<Portfolio>({
    cash: 0,
    positions: {},
    totalValue: 0,
  });
  const [forexPairs, setForexPairs] = useState<ForexPair[]>([]);
  const [selectedPair, setSelectedPair] = useState<ForexPair | null>(null);
  const [loading, setLoading] = useState(false);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [orderSize, setOrderSize] = useState(1000);
  const [leverage, setLeverage] = useState(100);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy');

  const fetchForexData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/forex');
      const data = await response.json();
      
      if (data.success) {
        setForexPairs(data.data);
        if (!selectedPair && data.data.length > 0) {
          setSelectedPair(data.data[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching forex data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load portfolio from database
  const loadPortfolio = async () => {
    if (!session?.user) return;

    try {
      const response = await fetch('/api/unified-trading');
      const data = await response.json();
      
      if (data && data.cash !== undefined) {
        setPortfolio({
          cash: data.cash,
          positions: data.forexPositions || {},
          totalValue: data.totalValue,
        });
        console.log('Forex portfolio loaded:', data);
      }
    } catch (error) {
      console.error('Error loading portfolio:', error);
    }
  };

  // Manual refresh function
  const refreshPortfolio = async () => {
    setMessage('Refreshing portfolio...');
    await loadPortfolio();
    await fetchForexData();
    setMessage('Portfolio refreshed!');
    setTimeout(() => setMessage(''), 2000);
  };

  useEffect(() => {
    loadPortfolio();
    fetchForexData();
    const interval = setInterval(fetchForexData, 5000);
    return () => clearInterval(interval);
  }, [session]);

  const executeTrade = async (type: 'buy' | 'sell') => {
    if (!selectedPair || !session?.user) return;

    try {
      const response = await fetch('/api/unified-trading', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'open',
          assetType: 'forex',
          symbol: selectedPair.symbol,
          amount: orderSize,
          price: type === 'buy' ? selectedPair.ask : selectedPair.bid,
          leverage: leverage,
          type: type,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setPortfolio({
          cash: data.portfolio.cash,
          positions: data.portfolio.forexPositions || {},
          totalValue: data.portfolio.totalValue,
        });
        setMessage(`Successfully opened ${type} position for ${selectedPair.symbol}`);
        
        // Clear message after 3 seconds
        setTimeout(() => setMessage(''), 3000);
        
        // Refresh portfolio data
        loadPortfolio();
      } else {
        setMessage(data.error || 'Trade failed');
      }
    } catch (error) {
      console.error('Error executing trade:', error);
      setMessage('Failed to execute trade');
    }
  };

  // Close position function
  const closePosition = async (symbol: string, type: 'buy' | 'sell', size: number, pair: ForexPair) => {
    if (!session?.user) {
      setMessage('Please log in to close positions');
      return;
    }

    try {
      const response = await fetch('/api/unified-trading', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'close',
          assetType: 'forex',
          symbol: symbol,
          amount: size,
          price: type === 'buy' ? pair.bid : pair.ask, // Use bid price to close buy position, ask price to close sell position
          type: type,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setPortfolio({
          cash: data.portfolio.cash,
          positions: data.portfolio.forexPositions || {},
          totalValue: data.portfolio.totalValue,
        });
        setMessage(`Successfully closed ${type} position for ${symbol}`);
        
        // Clear message after 3 seconds
        setTimeout(() => setMessage(''), 3000);
        
        // Refresh portfolio data
        loadPortfolio();
      } else {
        setMessage(data.error || 'Failed to close position');
      }
    } catch (error) {
      console.error('Error closing position:', error);
      setMessage('Failed to close position');
    }
  };

  const filteredPairs = forexPairs.filter(pair =>
    pair.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pair.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getPositionValue = (pair: ForexPair, position: { size: number; avgPrice: number; type: 'buy' | 'sell' }) => {
    const currentPrice = position.type === 'buy' ? pair.bid : pair.ask;
    const priceDiff = position.type === 'buy' ? 
      (currentPrice - position.avgPrice) : 
      (position.avgPrice - currentPrice);
    return (priceDiff * position.size);
  };

  const getTotalGainLoss = () => {
    return Object.entries(portfolio.positions).reduce((total, [key, position]) => {
      const symbol = key.split('_')[0];
      const pair = forexPairs.find(p => p.symbol === symbol);
      if (!pair) return total;
      return total + getPositionValue(pair, position);
    }, 0);
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Please Sign In</h2>
          <p className="text-gray-300 mb-6">You need to sign in with Discord to access the Forex Trading Simulator</p>
          <button
            onClick={() => window.location.href = '/api/auth/signin'}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            Sign In with Discord
          </button>
        </div>
      </div>
    );
  }

  if (portfolioLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading portfolio...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">💱 Forex Trading Simulator</h1>
            <p className="text-blue-200">Trade major currency pairs with virtual capital</p>
            {session && (
              <div className="flex items-center mt-2">
                <span className="text-sm text-blue-300">📊 Portfolio linked to: {session.user?.name}</span>
              </div>
            )}
          </div>
          <div className="flex space-x-3">
            <button
              onClick={refreshPortfolio}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center space-x-2"
            >
              <span>🔄</span>
              <span>Refresh</span>
            </button>
            <button
              onClick={onBackToHome}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              ← Back to Home
            </button>
          </div>
        </div>

        {/* Market Status - Forex is 24/5 */}
        <div className="bg-gradient-to-r from-blue-800/50 to-blue-900/50 backdrop-blur-sm rounded-2xl border border-blue-500/30 p-6 mb-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-white flex items-center">
              🏛️ Forex Market Status
            </h2>
            <div className="text-blue-200 text-sm">
              ET: {new Date().toLocaleTimeString('en-US', { timeZone: 'America/New_York' })}
            </div>
          </div>
          <div className="mt-4">
            <div className="bg-green-600/20 border border-green-500/30 rounded-lg p-3">
              <span className="text-green-400 font-semibold">🟢 Market Open</span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-blue-300">Sydney:</span>
                <span className="text-white ml-2">5:00 PM - 2:00 AM ET</span>
              </div>
              <div>
                <span className="text-blue-300">Tokyo:</span>
                <span className="text-white ml-2">7:00 PM - 4:00 AM ET</span>
              </div>
              <div>
                <span className="text-blue-300">London:</span>
                <span className="text-white ml-2">3:00 AM - 12:00 PM ET</span>
              </div>
            </div>
          </div>
        </div>

        {/* Portfolio Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-6">
          <div className="bg-gradient-to-br from-green-800/50 to-green-900/50 backdrop-blur-sm rounded-2xl border border-green-500/30 p-6">
            <h3 className="text-lg font-semibold text-green-200 mb-2">💰 Available Cash</h3>
            <div className="text-3xl font-bold text-green-400">${portfolio.cash.toLocaleString()}</div>
          </div>
          
          <div className="bg-gradient-to-br from-purple-800/50 to-purple-900/50 backdrop-blur-sm rounded-2xl border border-purple-500/30 p-6">
            <h3 className="text-lg font-semibold text-purple-200 mb-2">📊 Portfolio Value</h3>
            <div className="text-3xl font-bold text-purple-400">${portfolio.totalValue.toLocaleString()}</div>
          </div>
          
          <div className="bg-gradient-to-br from-blue-800/50 to-blue-900/50 backdrop-blur-sm rounded-2xl border border-blue-500/30 p-6">
            <h3 className="text-lg font-semibold text-blue-200 mb-2">📈 Total Gain/Loss</h3>
            <div className={`text-3xl font-bold ${getTotalGainLoss() >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              ${getTotalGainLoss().toLocaleString()}
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Forex Pairs List */}
          <div className="lg:col-span-2">
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-500/30 p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">📋 Available Currency Pairs</h2>
                <input
                  type="text"
                  placeholder="Search pairs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-slate-700/50 border border-slate-500/30 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 w-64"
                />
              </div>

              {loading ? (
                <div className="text-center py-8">
                  <div className="text-white">Loading forex data...</div>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {filteredPairs.map((pair) => {
                    const position = portfolio.positions[`${pair.symbol}_buy`] || portfolio.positions[`${pair.symbol}_sell`];
                    const pnl = position ? getPositionValue(pair, position) : 0;
                    
                    return (
                      <div
                        key={pair.symbol}
                        className={`bg-slate-700/30 rounded-xl p-4 cursor-pointer transition-all hover:bg-slate-600/40 ${
                          selectedPair?.symbol === pair.symbol ? 'ring-2 ring-blue-400' : ''
                        }`}
                        onClick={() => setSelectedPair(pair)}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="flex items-center space-x-2">
                              <h3 className="text-xl font-bold text-white">{pair.symbol}</h3>
                              <a
                                href={`https://www.tradingview.com/symbols/${pair.symbol.replace('/', '')}/`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
                                title="View on TradingView"
                              >
                                📊
                              </a>
                            </div>
                            <p className="text-slate-300 text-sm">{pair.name}</p>
                            {position && (
                              <p className="text-xs text-blue-300">
                                Own: {position.size.toLocaleString()} ({position.avgPrice.toFixed(4)})
                                <span className={`ml-2 ${pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                  P&L: ${pnl.toFixed(2)}
                                </span>
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-white">{pair.price.toFixed(4)}</div>
                            <div className={`text-sm font-semibold ${pair.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {pair.changePercent >= 0 ? '+' : ''}{pair.change.toFixed(4)} ({pair.changePercent.toFixed(2)}%)
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-slate-400">Bid:</span>
                            <span className="text-white ml-2">{pair.bid.toFixed(4)}</span>
                          </div>
                          <div>
                            <span className="text-slate-400">Ask:</span>
                            <span className="text-white ml-2">{pair.ask.toFixed(4)}</span>
                          </div>
                          <div>
                            <span className="text-slate-400">Spread:</span>
                            <span className="text-white ml-2">{pair.spread.toFixed(4)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Trading Panel */}
          <div className="space-y-6">
            {!selectedPair ? (
              <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-500/30 p-6">
                <h3 className="text-xl font-bold text-white mb-4">Select a pair to start trading</h3>
                <p className="text-slate-300">Choose any currency pair from the list to view its details and start trading</p>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-500/30 p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-white">Trade {selectedPair?.symbol}</h3>
                  <a
                    href={`https://www.tradingview.com/symbols/${selectedPair?.symbol.replace('/', '')}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-sm font-semibold transition-colors flex items-center space-x-1"
                  >
                    <span>📊</span>
                    <span>View Chart</span>
                  </a>
                </div>

                {/* Buy/Sell Tabs */}
                <div className="flex mb-6 bg-slate-700/30 rounded-lg p-1">
                  <button
                    onClick={() => setActiveTab('buy')}
                    className={`flex-1 py-2 px-4 rounded-md font-semibold transition-colors ${
                      activeTab === 'buy'
                        ? 'bg-green-600 text-white'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    📈 BUY
                  </button>
                  <button
                    onClick={() => setActiveTab('sell')}
                    className={`flex-1 py-2 px-4 rounded-md font-semibold transition-colors ${
                      activeTab === 'sell'
                        ? 'bg-red-600 text-white'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    📉 SELL
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-slate-300 text-sm font-medium mb-2">Order Size (USD)</label>
                    <input
                      type="number"
                      value={orderSize}
                      onChange={(e) => setOrderSize(Number(e.target.value))}
                      className="w-full bg-slate-700/50 border border-slate-500/30 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                      min="100"
                      step="100"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 text-sm font-medium mb-2">Leverage</label>
                    <select
                      value={leverage}
                      onChange={(e) => setLeverage(Number(e.target.value))}
                      className="w-full bg-slate-700/50 border border-slate-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                      <option value={50}>50:1</option>
                      <option value={100}>100:1</option>
                      <option value={200}>200:1</option>
                      <option value={500}>500:1</option>
                    </select>
                  </div>

                  <div className="bg-slate-700/30 rounded-lg p-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-400">Required Margin:</span>
                      <span className="text-white">${(orderSize / leverage).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-400">
                        {activeTab === 'buy' ? 'Buy Price (Ask):' : 'Sell Price (Bid):'}
                      </span>
                      <span className="text-white">
                        {activeTab === 'buy' ? selectedPair?.ask.toFixed(4) : selectedPair?.bid.toFixed(4)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Spread:</span>
                      <span className="text-white">{selectedPair?.spread.toFixed(4)}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => executeTrade(activeTab)}
                    className={`w-full py-3 rounded-lg font-bold transition-all transform hover:scale-105 ${
                      activeTab === 'buy'
                        ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white'
                        : 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white'
                    }`}
                  >
                    {activeTab === 'buy' ? '📈 BUY' : '📉 SELL'} {selectedPair?.symbol}
                  </button>
                </div>
              </div>
            )}

            {/* Open Positions */}
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-500/30 p-6">
              <h3 className="text-xl font-bold text-white mb-4">Open Positions</h3>
              {Object.keys(portfolio.positions).length === 0 ? (
                <p className="text-slate-400 text-center">No open positions</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(portfolio.positions).map(([key, position]) => {
                    const [symbol, type] = key.split('_');
                    const pair = forexPairs.find(p => p.symbol === symbol);
                    if (!pair) return null;
                    
                    const pnl = getPositionValue(pair, position);
                    
                    return (
                      <div key={key} className="bg-slate-700/30 rounded-lg p-3">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="flex items-center space-x-2">
                              <div className="font-semibold text-white">{symbol}</div>
                              <a
                                href={`https://www.tradingview.com/symbols/${symbol.replace('/', '')}/`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:text-blue-300 text-xs transition-colors"
                                title="View on TradingView"
                              >
                                📊
                              </a>
                            </div>
                            <div className={`text-sm ${type === 'buy' ? 'text-green-400' : 'text-red-400'}`}>
                              {type.toUpperCase()} {position.size.toLocaleString()}
                            </div>
                            <div className="text-xs text-slate-400">
                              Entry: {position.avgPrice.toFixed(4)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`text-sm font-semibold ${pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                            </div>
                            <button
                              onClick={() => closePosition(symbol, type as 'buy' | 'sell', position.size, pair)}
                              className="mt-2 bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs font-semibold transition-colors"
                            >
                              Close
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {message && (
          <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg">
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
