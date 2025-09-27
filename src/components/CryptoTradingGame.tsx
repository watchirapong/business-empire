'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import UserProfile from './UserProfile';

interface Crypto {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
  circulatingSupply: number;
}

interface Portfolio {
  cash: number;
  cryptos: Record<string, { quantity: number; avgPrice: number }>;
  totalValue: number;
}

interface CryptoTradingGameProps {
  onBackToHome: () => void;
}

export default function CryptoTradingGame({ onBackToHome }: CryptoTradingGameProps) {
  const { data: session } = useSession();
  const [portfolio, setPortfolio] = useState<Portfolio>({
    cash: 50000,
    cryptos: {},
    totalValue: 50000,
  });
  const [cryptos, setCryptos] = useState<Crypto[]>([]);
  const [selectedCrypto, setSelectedCrypto] = useState<Crypto | null>(null);
  const [loading, setLoading] = useState(false);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [amountToBuy, setAmountToBuy] = useState(100);
  const [quantityToSell, setQuantityToSell] = useState(0.01);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy');
  const [trading, setTrading] = useState(false);

  const fetchCryptoData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/crypto');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setCryptos(data.data);
        if (!selectedCrypto && data.data.length > 0) {
          setSelectedCrypto(data.data[0]);
        }
      } else {
        console.error('API returned error:', data.error);
      }
    } catch (error) {
      console.error('Error fetching crypto data:', error);
      // Don't clear existing data on error, just log it
    } finally {
      setLoading(false);
    }
  }, [selectedCrypto]);

  // Load portfolio from database
  const loadPortfolio = useCallback(async () => {
    if (!session?.user) return;

    try {
      const response = await fetch('/api/unified-trading');
      const data = await response.json();
      
      if (data && data.cash !== undefined) {
        setPortfolio({
          cash: data.cash,
          cryptos: data.cryptos || {},
          totalValue: data.totalValue,
        });
        console.log('Portfolio loaded:', data);
      }
    } catch (error) {
      console.error('Error loading portfolio:', error);
    }
  }, [session?.user]);

  // Manual refresh function
  const refreshPortfolio = async () => {
    setMessage('Refreshing portfolio...');
    await loadPortfolio();
    await fetchCryptoData();
    setMessage('Portfolio refreshed!');
    setTimeout(() => setMessage(''), 2000);
  };

  useEffect(() => {
    loadPortfolio();
    fetchCryptoData();
    const interval = setInterval(fetchCryptoData, 5000);
    return () => clearInterval(interval);
  }, [session?.user, loadPortfolio, fetchCryptoData]);

  const executeTrade = async (type: 'buy' | 'sell') => {
    if (!selectedCrypto || !session?.user || trading) return;
    
    setTrading(true);

    // Validate inputs
    if (type === 'buy') {
      if (!amountToBuy || amountToBuy <= 0 || amountToBuy > 1000000) {
        setMessage('Invalid buy amount. Please enter a value between 1 and 1,000,000');
        setTrading(false);
        return;
      }
    } else {
      if (!quantityToSell || quantityToSell <= 0 || quantityToSell > 1000000) {
        setMessage('Invalid sell quantity. Please enter a value between 0.000001 and 1,000,000');
        setTrading(false);
        return;
      }
      
      // Check if user has enough to sell
      const currentHolding = portfolio.cryptos[selectedCrypto.symbol];
      if (!currentHolding || currentHolding.quantity < quantityToSell) {
        setMessage(`Insufficient ${selectedCrypto.symbol} to sell. You have ${currentHolding?.quantity?.toFixed(6) || 0}`);
        setTrading(false);
        return;
      }
    }

    try {
      const requestBody = {
        action: type,
        assetType: 'crypto',
        symbol: selectedCrypto.symbol,
        amount: type === 'buy' ? amountToBuy : undefined,
        quantity: type === 'sell' ? quantityToSell : undefined,
        price: selectedCrypto.price,
      };
      
      console.log('Sending trade request:', requestBody);
      
      const response = await fetch('/api/unified-trading', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      console.log('Trade response:', data);
      
      if (data.success) {
        // Update portfolio with the response data immediately
        setPortfolio({
          cash: data.portfolio.cash,
          cryptos: data.portfolio.cryptos || {},
          totalValue: data.portfolio.totalValue,
        });
        setMessage(`Successfully ${type === 'buy' ? 'bought' : 'sold'} ${selectedCrypto.symbol}`);
        
        // Clear the message after 3 seconds
        setTimeout(() => setMessage(''), 3000);
        
        // Refresh crypto data to get updated prices
        fetchCryptoData();
        
        // Reset input values
        if (type === 'buy') {
          setAmountToBuy(100);
        } else {
          setQuantityToSell(0.01);
        }
      } else {
        setMessage(data.error || 'Trade failed');
        // Clear error message after 5 seconds
        setTimeout(() => setMessage(''), 5000);
      }
    } catch (error) {
      console.error('Error executing trade:', error);
      setMessage('Failed to execute trade. Please try again.');
      // Clear error message after 5 seconds
      setTimeout(() => setMessage(''), 5000);
    } finally {
      setTrading(false);
    }
  };

  const filteredCryptos = cryptos.filter(crypto =>
    crypto.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
    crypto.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTotalGainLoss = () => {
    return Object.entries(portfolio.cryptos).reduce((total, [symbol, holding]) => {
      const crypto = cryptos.find(c => c.symbol === symbol);
      if (!crypto) return total;
      const currentValue = holding.quantity * crypto.price;
      const costBasis = holding.quantity * holding.avgPrice;
      return total + (currentValue - costBasis);
    }, 0);
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Please Sign In</h2>
          <p className="text-gray-300 mb-6">You need to sign in with Discord to access the Crypto Trading Simulator</p>
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
            <h1 className="text-4xl font-bold text-white mb-2">₿ Crypto Trading Simulator</h1>
            <p className="text-blue-200">Trade Bitcoin, Ethereum and other cryptocurrencies</p>
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

        {/* Market Status - Crypto is 24/7 */}
        <div className="bg-gradient-to-r from-blue-800/50 to-blue-900/50 backdrop-blur-sm rounded-2xl border border-blue-500/30 p-6 mb-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-white flex items-center">
              🏛️ Crypto Market Status
            </h2>
            <div className="text-blue-200 text-sm">
              UTC: {new Date().toLocaleTimeString('en-US', { timeZone: 'UTC' })}
            </div>
          </div>
          <div className="mt-4">
            <div className="bg-green-600/20 border border-green-500/30 rounded-lg p-3">
              <span className="text-green-400 font-semibold">🟢 Market Open 24/7</span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-blue-300">Trading:</span>
                <span className="text-white ml-2">24 hours a day</span>
              </div>
              <div>
                <span className="text-blue-300">Days:</span>
                <span className="text-white ml-2">7 days a week</span>
              </div>
              <div>
                <span className="text-blue-300">Availability:</span>
                <span className="text-white ml-2">365 days a year</span>
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
          {/* Crypto List */}
          <div className="lg:col-span-2">
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-500/30 p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">📋 Available Cryptocurrencies</h2>
                <input
                  type="text"
                  placeholder="Search cryptos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-slate-700/50 border border-slate-500/30 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 w-64"
                />
              </div>

              {loading ? (
                <div className="text-center py-8">
                  <div className="text-white">Loading crypto data...</div>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {filteredCryptos.map((crypto) => {
                    const holding = portfolio.cryptos[crypto.symbol];
                    const currentValue = holding ? holding.quantity * crypto.price : 0;
                    const costBasis = holding ? holding.quantity * holding.avgPrice : 0;
                    const pnl = currentValue - costBasis;
                    
                    return (
                      <div
                        key={crypto.symbol}
                        className={`bg-slate-700/30 rounded-xl p-4 cursor-pointer transition-all hover:bg-slate-600/40 ${
                          selectedCrypto?.symbol === crypto.symbol ? 'ring-2 ring-blue-400' : ''
                        }`}
                        onClick={() => setSelectedCrypto(crypto)}
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                              {crypto.symbol.charAt(0)}
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <h3 className="text-xl font-bold text-white">{crypto.name}</h3>
                                <a
                                  href={`https://www.tradingview.com/symbols/CRYPTOCAP-${crypto.symbol}/`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
                                  title="View on TradingView"
                                >
                                  📊
                                </a>
                              </div>
                              <p className="text-slate-300 text-sm">{crypto.symbol}</p>
                              {holding && (
                                <p className="text-xs text-blue-300">
                                  Own: {holding.quantity.toFixed(6)} (${holding.avgPrice.toFixed(2)})
                                  <span className={`ml-2 ${pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    P&L: ${pnl.toFixed(2)}
                                  </span>
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-white">${crypto.price.toLocaleString()}</div>
                            <div className={`text-sm font-semibold ${crypto.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {crypto.changePercent >= 0 ? '+' : ''}{crypto.changePercent.toFixed(2)}%
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-slate-400">Market Cap:</span>
                            <span className="text-white ml-2">${(crypto.marketCap / 1e9).toFixed(1)}B</span>
                          </div>
                          <div>
                            <span className="text-slate-400">Volume 24h:</span>
                            <span className="text-white ml-2">${(crypto.volume / 1e6).toFixed(0)}M</span>
                          </div>
                          <div>
                            <span className="text-slate-400">Supply:</span>
                            <span className="text-white ml-2">{(crypto.circulatingSupply / 1e6).toFixed(0)}M</span>
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
            {selectedCrypto ? (
              <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-500/30 p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-white">Trade {selectedCrypto.symbol}</h3>
                  <a
                    href={`https://www.tradingview.com/symbols/CRYPTOCAP-${selectedCrypto.symbol}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-sm font-semibold transition-colors flex items-center space-x-1"
                  >
                    <span>📊</span>
                    <span>View Chart</span>
                  </a>
                </div>

                {/* Tab Navigation */}
                <div className="flex space-x-1 mb-6 bg-slate-700/50 p-1 rounded-lg">
                  <button
                    onClick={() => setActiveTab('buy')}
                    className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                      activeTab === 'buy' ? 'bg-green-600 text-white' : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    💚 Buy
                  </button>
                                      <button
                      onClick={() => {
                        setActiveTab('sell');
                        // Reset sell quantity to safe default when switching to sell tab
                        setQuantityToSell(0.01);
                      }}
                    className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                      activeTab === 'sell' ? 'bg-red-600 text-white' : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    🔴 Sell
                  </button>
                </div>

                {/* Market Info */}
                <div className="bg-slate-700/30 rounded-lg p-4 mb-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-400">Current Price:</span>
                    <span className="text-white">${selectedCrypto.price.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-400">24h Change:</span>
                    <span className={`${selectedCrypto.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {selectedCrypto.changePercent >= 0 ? '+' : ''}{selectedCrypto.changePercent.toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Your Holdings:</span>
                    <span className="text-white">
                      {portfolio.cryptos[selectedCrypto.symbol]?.quantity.toFixed(6) || '0.000000'} {selectedCrypto.symbol}
                    </span>
                  </div>
                </div>

                {/* Buy Tab */}
                {activeTab === 'buy' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-slate-300 text-sm font-medium mb-2">Amount to Buy (USD)</label>
                      <input
                        type="number"
                        value={amountToBuy}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value);
                          if (!isNaN(value) && value >= 1 && value <= 1000000) {
                            setAmountToBuy(value);
                          }
                        }}
                        className="w-full bg-slate-700/50 border border-slate-500/30 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                        min="1"
                        max="1000000"
                        step="1"
                        placeholder="100"
                      />
                      <p className="text-xs text-slate-400 mt-1">
                        ≈ {(amountToBuy / selectedCrypto.price).toFixed(6)} {selectedCrypto.symbol}
                      </p>
                    </div>

                    <button
                      onClick={() => executeTrade('buy')}
                      disabled={trading}
                      className={`w-full py-3 rounded-lg font-bold transition-all transform ${
                        trading 
                          ? 'bg-gray-600 text-gray-300 cursor-not-allowed' 
                          : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white hover:scale-105'
                      }`}
                    >
                      {trading ? '⏳ Processing...' : `💚 BUY ${selectedCrypto.symbol}`}
                    </button>
                  </div>
                )}

                {/* Sell Tab */}
                {activeTab === 'sell' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-slate-300 text-sm font-medium mb-2">Quantity to Sell</label>
                      <input
                        type="number"
                        value={quantityToSell}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value);
                          if (!isNaN(value) && value >= 0 && value <= 1000000) {
                            setQuantityToSell(value);
                          } else {
                            // Reset to a safe default if invalid input
                            setQuantityToSell(0.01);
                          }
                        }}
                        onBlur={(e) => {
                          const value = parseFloat(e.target.value);
                          if (isNaN(value) || value < 0 || value > 1000000) {
                            setQuantityToSell(0.01);
                          }
                        }}
                        className="w-full bg-slate-700/50 border border-slate-500/30 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                        min="0"
                        max="1000000"
                        step="0.000001"
                        placeholder="0.01"
                      />
                      <p className="text-xs text-slate-400 mt-1">
                        ≈ ${(quantityToSell * selectedCrypto.price).toFixed(2)} USD
                      </p>
                    </div>

                    <button
                      onClick={() => executeTrade('sell')}
                      disabled={trading}
                      className={`w-full py-3 rounded-lg font-bold transition-all transform ${
                        trading 
                          ? 'bg-gray-600 text-gray-300 cursor-not-allowed' 
                          : 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white hover:scale-105'
                      }`}
                    >
                      {trading ? '⏳ Processing...' : `🔴 SELL ${selectedCrypto.symbol}`}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-500/30 p-6">
                <h3 className="text-xl font-bold text-white mb-4">Select a crypto to start trading</h3>
                <p className="text-slate-300">Choose any cryptocurrency from the list to view its details and start trading</p>
              </div>
            )}

            {/* Portfolio Holdings */}
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-500/30 p-6">
              <h3 className="text-xl font-bold text-white mb-4">Your Holdings</h3>
              {Object.keys(portfolio.cryptos).length === 0 ? (
                <p className="text-slate-400 text-center">No crypto holdings</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(portfolio.cryptos).map(([symbol, holding]) => {
                    const crypto = cryptos.find(c => c.symbol === symbol);
                    if (!crypto) return null;
                    
                    const currentValue = holding.quantity * crypto.price;
                    const costBasis = holding.quantity * holding.avgPrice;
                    const pnl = currentValue - costBasis;
                    
                    return (
                      <div key={symbol} className="bg-slate-700/30 rounded-lg p-3">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="flex items-center space-x-2">
                              <div className="font-semibold text-white">{symbol}</div>
                              <a
                                href={`https://www.tradingview.com/symbols/CRYPTOCAP-${symbol}/`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:text-blue-300 text-xs transition-colors"
                                title="View on TradingView"
                              >
                                📊
                              </a>
                            </div>
                            <div className="text-sm text-slate-300">
                              {holding.quantity.toFixed(6)} @ ${holding.avgPrice.toFixed(2)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-white font-semibold">${currentValue.toFixed(2)}</div>
                            <div className={`text-sm ${pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                            </div>
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
          <div className={`fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg transition-all ${
            message.includes('Successfully') 
              ? 'bg-green-600 text-white' 
              : message.includes('Invalid') || message.includes('Insufficient') || message.includes('Failed')
              ? 'bg-red-600 text-white'
              : 'bg-blue-600 text-white'
          }`}>
            <div className="flex items-center space-x-2">
              <span>
                {message.includes('Successfully') ? '✅' : 
                 message.includes('Invalid') || message.includes('Insufficient') || message.includes('Failed') ? '❌' : 
                 'ℹ️'}
              </span>
              <span>{message}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
