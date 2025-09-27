'use client';

import { useState, useEffect } from 'react';
import ProfessionalChart from './ProfessionalChart';
import UserProfile from '../../UserProfile';

interface Stock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
}

interface Portfolio {
  cash: number;
  stocks: Record<string, { shares: number; avgPrice: number }>;
  totalValue: number;
}

interface StockTradingGameProps {
  onBackToHome: () => void;
}

const POPULAR_STOCKS = [
  { symbol: 'AAPL', name: 'Apple Inc.' },
  { symbol: 'MSFT', name: 'Microsoft Corporation' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.' },
  { symbol: 'TSLA', name: 'Tesla Inc.' },
  { symbol: 'META', name: 'Meta Platforms Inc.' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation' },
  { symbol: 'NFLX', name: 'Netflix Inc.' },
  { symbol: 'AMD', name: 'Advanced Micro Devices' },
  { symbol: 'INTC', name: 'Intel Corporation' },
];

export default function StockTradingGame({ onBackToHome }: StockTradingGameProps) {
  const [portfolio, setPortfolio] = useState<Portfolio>({
    cash: 100000,
    stocks: {},
    totalValue: 100000,
  });
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [stockChartData, setStockChartData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sharesToBuy, setSharesToBuy] = useState(1);
  const [sharesToSell, setSharesToSell] = useState(1);
  const [message, setMessage] = useState('');
  const [dataSource, setDataSource] = useState<'real' | 'simulated'>('real');

  // Fetch stock data from our local API
  const fetchStockData = async (symbol: string) => {
    try {
      const response = await fetch(`/api/stocks?symbol=${symbol}&type=quote`);
      const data = await response.json();
      
      if (data.error) {
        console.error('API Error:', data.error);
        setDataSource('simulated');
        return generateFallbackStockData(symbol);
      }
      
      // Check if data is simulated
      if (data.isSimulated) {
        setDataSource('simulated');
      } else {
        setDataSource('real');
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching stock data:', error);
      setDataSource('simulated');
      return generateFallbackStockData(symbol);
    }
  };

  // Generate realistic fallback stock data
  const generateFallbackStockData = (symbol: string) => {
    const basePrices: Record<string, number> = {
      'AAPL': 180,
      'MSFT': 380,
      'GOOGL': 140,
      'AMZN': 150,
      'TSLA': 250,
      'META': 350,
      'NVDA': 800,
      'NFLX': 600,
      'AMD': 120,
      'INTC': 45,
    };
    
    const basePrice = basePrices[symbol] || 100;
    const randomChange = (Math.random() - 0.5) * 10; // Random change between -5 and +5
    const currentPrice = basePrice + randomChange;
    const changePercent = (randomChange / basePrice) * 100;
    
    return {
      symbol: symbol,
      name: symbol,
      price: Math.round(currentPrice * 100) / 100,
      change: Math.round(randomChange * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
      volume: Math.floor(Math.random() * 10000000) + 1000000,
      marketCap: Math.floor(Math.random() * 1000000000000) + 100000000000,
    };
  };

  // Fetch historical data for charts from our local API
  const fetchHistoricalData = async (symbol: string) => {
    try {
      const response = await fetch(`/api/stocks?symbol=${symbol}&type=chart`);
      const data = await response.json();
      
      if (data.error) {
        console.error('API Error:', data.error);
        return generateFallbackChartData(symbol);
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching historical data:', error);
      return generateFallbackChartData(symbol);
    }
  };

  // Generate fallback chart data
  const generateFallbackChartData = (symbol: string) => {
    const basePrices: Record<string, number> = {
      'AAPL': 180,
      'MSFT': 380,
      'GOOGL': 140,
      'AMZN': 150,
      'TSLA': 250,
      'META': 350,
      'NVDA': 800,
      'NFLX': 600,
      'AMD': 120,
      'INTC': 45,
    };
    
    const basePrice = basePrices[symbol] || 100;
    const prices: number[] = [];
    const labels: string[] = [];
    
    // Generate 30 days of realistic price data
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      labels.push(date.toLocaleDateString());
      
      // Add some realistic price movement
      const randomChange = (Math.random() - 0.5) * 0.02; // ±1% daily change
      const newPrice = basePrice * (1 + randomChange);
      prices.push(Math.round(newPrice * 100) / 100);
    }
    
    return {
      labels: labels,
      datasets: [{
        label: `${symbol} Stock Price (Simulated)`,
        data: prices,
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        tension: 0.1,
      }],
    };
  };

  // Load initial stock data
  useEffect(() => {
    const loadStockData = async () => {
      setLoading(true);
      const stockData: Stock[] = [];
      
      for (const stock of POPULAR_STOCKS) {
        const data = await fetchStockData(stock.symbol);
        if (data) {
          stockData.push({ ...data, name: stock.name });
        }
      }
      
      setStocks(stockData);
      setLoading(false);
    };

    loadStockData();
  }, [fetchStockData]);

  // Update portfolio total value
  useEffect(() => {
    let totalValue = portfolio.cash;
    Object.entries(portfolio.stocks).forEach(([symbol, holding]) => {
      const stock = stocks.find(s => s.symbol === symbol);
      if (stock) {
        totalValue += holding.shares * stock.price;
      }
    });
    setPortfolio(prev => ({ ...prev, totalValue }));
  }, [stocks, portfolio.cash, portfolio.stocks]);

  const handleStockSelect = async (stock: Stock) => {
    setSelectedStock(stock);
    setLoading(true);
    try {
      const chartData = await fetchHistoricalData(stock.symbol);
      console.log('Chart data loaded:', chartData);
      setStockChartData(chartData);
    } catch (error) {
      console.error('Error loading chart data:', error);
    } finally {
      setLoading(false);
    }
  };

  const buyStock = () => {
    if (!selectedStock || sharesToBuy <= 0) return;
    
    const totalCost = selectedStock.price * sharesToBuy;
    if (totalCost > portfolio.cash) {
      setMessage('Insufficient funds!');
      return;
    }

    const currentHolding = portfolio.stocks[selectedStock.symbol] || { shares: 0, avgPrice: 0 };
    const newShares = currentHolding.shares + sharesToBuy;
    const newAvgPrice = ((currentHolding.shares * currentHolding.avgPrice) + totalCost) / newShares;

    setPortfolio(prev => ({
      ...prev,
      cash: prev.cash - totalCost,
      stocks: {
        ...prev.stocks,
        [selectedStock.symbol]: { shares: newShares, avgPrice: newAvgPrice },
      },
    }));

    setMessage(`Successfully bought ${sharesToBuy} shares of ${selectedStock.symbol} at $${selectedStock.price.toFixed(2)}`);
    setSharesToBuy(1);
  };

  const sellStock = () => {
    if (!selectedStock || sharesToSell <= 0) return;
    
    const currentHolding = portfolio.stocks[selectedStock.symbol];
    if (!currentHolding || currentHolding.shares < sharesToSell) {
      setMessage('Insufficient shares!');
      return;
    }

    const totalValue = selectedStock.price * sharesToSell;
    const newShares = currentHolding.shares - sharesToSell;

    setPortfolio(prev => ({
      ...prev,
      cash: prev.cash + totalValue,
      stocks: {
        ...prev.stocks,
        [selectedStock.symbol]: {
          ...currentHolding,
          shares: newShares,
        },
      },
    }));

    setMessage(`Successfully sold ${sharesToSell} shares of ${selectedStock.symbol} at $${selectedStock.price.toFixed(2)}`);
    setSharesToSell(1);
  };

  const getCurrentHolding = (symbol: string) => {
    return portfolio.stocks[symbol] || { shares: 0, avgPrice: 0 };
  };

  const getHoldingValue = (symbol: string) => {
    const holding = getCurrentHolding(symbol);
    const stock = stocks.find(s => s.symbol === symbol);
    return stock ? holding.shares * stock.price : 0;
  };

  const getHoldingGainLoss = (symbol: string) => {
    const holding = getCurrentHolding(symbol);
    const stock = stocks.find(s => s.symbol === symbol);
    if (!stock || holding.shares === 0) return 0;
    return (stock.price - holding.avgPrice) * holding.shares;
  };

  const filteredStocks = stocks.filter(stock =>
    stock.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
    stock.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
              📈 Stock Trading Simulator
            </h1>
            <div className="flex items-center space-x-4 mt-2">
              <p className="text-gray-300">Trade real NASDAQ stocks with $100,000 virtual capital</p>
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                dataSource === 'real' 
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                  : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
              }`}>
                {dataSource === 'real' ? '🟢 LIVE DATA' : '🟡 SIMULATED'}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <UserProfile />
            <button
              onClick={onBackToHome}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-semibold transition-colors"
            >
              ← Back to Home
            </button>
          </div>
        </div>

        {/* Portfolio Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <h3 className="text-lg font-semibold text-blue-300 mb-2">💰 Available Cash</h3>
            <p className="text-3xl font-bold text-green-400">${portfolio.cash.toLocaleString()}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <h3 className="text-lg font-semibold text-blue-300 mb-2">📊 Portfolio Value</h3>
            <p className="text-3xl font-bold text-purple-400">${portfolio.totalValue.toLocaleString()}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <h3 className="text-lg font-semibold text-blue-300 mb-2">📈 Total Gain/Loss</h3>
            <p className={`text-3xl font-bold ${portfolio.totalValue >= 100000 ? 'text-green-400' : 'text-red-400'}`}>
              ${(portfolio.totalValue - 100000).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Stock List */}
          <div className="lg:col-span-1">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <h2 className="text-2xl font-bold mb-4 text-blue-300">📋 Available Stocks</h2>
              
              {/* Search */}
              <input
                type="text"
                placeholder="Search stocks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-gray-300 mb-4"
              />

              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto"></div>
                  <p className="mt-2 text-gray-300">Loading stock data...</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {filteredStocks.map((stock) => {
                    const holding = getCurrentHolding(stock.symbol);
                    const holdingValue = getHoldingValue(stock.symbol);
                    const gainLoss = getHoldingGainLoss(stock.symbol);
                    
                    return (
                      <div
                        key={stock.symbol}
                        onClick={() => handleStockSelect(stock)}
                        className={`p-4 rounded-lg cursor-pointer transition-all ${
                          selectedStock?.symbol === stock.symbol
                            ? 'bg-blue-600/30 border-2 border-blue-400'
                            : 'bg-white/5 hover:bg-white/10 border border-white/10'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-bold text-lg">{stock.symbol}</h3>
                            <p className="text-sm text-gray-300">{stock.name}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-lg">${stock.price.toFixed(2)}</p>
                            <p className={`text-sm ${stock.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)} ({stock.changePercent.toFixed(2)}%)
                            </p>
                          </div>
                        </div>
                        
                        {holding.shares > 0 && (
                          <div className="mt-2 pt-2 border-t border-white/20">
                            <p className="text-sm text-gray-300">
                              Own: {holding.shares} shares (${holdingValue.toFixed(2)})
                            </p>
                            <p className={`text-sm ${gainLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              P&L: ${gainLoss.toFixed(2)}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Trading Panel and Chart */}
          <div className="lg:col-span-2 space-y-6">
            {selectedStock ? (
              <>
                {/* Stock Info and Trading */}
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 className="text-3xl font-bold">{selectedStock.symbol}</h2>
                      <p className="text-gray-300">{selectedStock.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-4xl font-bold">${selectedStock.price.toFixed(2)}</p>
                      <p className={`text-lg ${selectedStock.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {selectedStock.change >= 0 ? '+' : ''}{selectedStock.change.toFixed(2)} ({selectedStock.changePercent.toFixed(2)}%)
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Buy Panel */}
                    <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-green-400 mb-3">🟢 Buy Shares</h3>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm text-gray-300 mb-1">Shares to buy:</label>
                          <input
                            type="number"
                            min="1"
                            value={sharesToBuy}
                            onChange={(e) => setSharesToBuy(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded text-white"
                          />
                        </div>
                        <p className="text-sm text-gray-300">
                          Total cost: ${(selectedStock.price * sharesToBuy).toFixed(2)}
                        </p>
                        <button
                          onClick={buyStock}
                          disabled={selectedStock.price * sharesToBuy > portfolio.cash}
                          className="w-full py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded font-semibold transition-colors"
                        >
                          Buy Shares
                        </button>
                      </div>
                    </div>

                    {/* Sell Panel */}
                    <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-red-400 mb-3">🔴 Sell Shares</h3>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm text-gray-300 mb-1">Shares to sell:</label>
                          <input
                            type="number"
                            min="1"
                            max={getCurrentHolding(selectedStock.symbol).shares}
                            value={sharesToSell}
                            onChange={(e) => setSharesToSell(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded text-white"
                          />
                        </div>
                        <p className="text-sm text-gray-300">
                          Total value: ${(selectedStock.price * sharesToSell).toFixed(2)}
                        </p>
                        <button
                          onClick={sellStock}
                          disabled={getCurrentHolding(selectedStock.symbol).shares < sharesToSell}
                          className="w-full py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded font-semibold transition-colors"
                        >
                          Sell Shares
                        </button>
                      </div>
                    </div>
                  </div>

                  {message && (
                    <div className="mt-4 p-3 bg-blue-600/20 border border-blue-500/30 rounded text-center">
                      {message}
                    </div>
                  )}
                </div>

                {/* Professional Stock Chart */}
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                  <h3 className="text-xl font-bold mb-4 text-blue-300">📈 Professional Chart (30 Days)</h3>
                  <div className="h-96">
                    {loading ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-white text-lg">Loading chart data...</div>
                      </div>
                    ) : stockChartData ? (
                      <ProfessionalChart 
                        data={stockChartData} 
                        symbol={selectedStock.symbol} 
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-white text-lg">Select a stock to view chart</div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 text-center">
                <h3 className="text-xl font-bold mb-4 text-blue-300">Select a stock to start trading</h3>
                <p className="text-gray-300">Choose any stock from the list to view its details and start trading</p>
              </div>
            )}
          </div>
        </div>

        {/* Portfolio Holdings */}
        {Object.keys(portfolio.stocks).length > 0 && (
          <div className="mt-8 bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <h2 className="text-2xl font-bold mb-4 text-blue-300">💼 Your Portfolio</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(portfolio.stocks).map(([symbol, holding]) => {
                const stock = stocks.find(s => s.symbol === symbol);
                const currentValue = stock ? holding.shares * stock.price : 0;
                const gainLoss = stock ? (stock.price - holding.avgPrice) * holding.shares : 0;
                const gainLossPercent = stock ? ((stock.price - holding.avgPrice) / holding.avgPrice) * 100 : 0;

                return (
                  <div key={symbol} className="bg-white/5 border border-white/10 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-lg">{symbol}</h3>
                      <p className="text-sm text-gray-300">{holding.shares} shares</p>
                    </div>
                    {stock && (
                      <>
                        <p className="text-sm text-gray-300">Avg Price: ${holding.avgPrice.toFixed(2)}</p>
                        <p className="text-sm text-gray-300">Current: ${stock.price.toFixed(2)}</p>
                        <p className="text-sm text-gray-300">Value: ${currentValue.toFixed(2)}</p>
                        <p className={`text-sm font-semibold ${gainLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          P&L: ${gainLoss.toFixed(2)} ({gainLossPercent.toFixed(2)}%)
                        </p>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
