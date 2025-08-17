import { NextResponse } from 'next/server';

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

// Generate detailed candlestick chart data
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
  const candlesticks: any[] = [];
  const volumes: number[] = [];
  const labels: string[] = [];
  
  let currentPrice = basePrice;
  
  // Generate 30 days of realistic candlestick data
  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    labels.push(date.toLocaleDateString());
    
    // Generate OHLC data (Open, High, Low, Close)
    const dailyVolatility = 0.02; // 2% daily volatility
    const open = currentPrice;
    const high = open * (1 + Math.random() * dailyVolatility);
    const low = open * (1 - Math.random() * dailyVolatility);
    const close = open * (1 + (Math.random() - 0.5) * dailyVolatility);
    
    // Ensure high is highest and low is lowest
    const max = Math.max(open, high, low, close);
    const min = Math.min(open, high, low, close);
    
    candlesticks.push({
      x: date.toLocaleDateString(),
      o: Math.round(open * 100) / 100,
      h: Math.round(max * 100) / 100,
      l: Math.round(min * 100) / 100,
      c: Math.round(close * 100) / 100,
    });
    
    // Generate volume data
    const baseVolume = 1000000;
    const volumeVariation = Math.random() * 0.5 + 0.5; // 50-150% of base volume
    volumes.push(Math.floor(baseVolume * volumeVariation));
    
    currentPrice = close;
  }
  
  // Calculate moving averages
  const sma20 = calculateSMA(candlesticks.map(c => c.c), 20);
  const sma50 = calculateSMA(candlesticks.map(c => c.c), 50);
  
  return {
    labels: labels,
    candlesticks: candlesticks,
    volumes: volumes,
    sma20: sma20,
    sma50: sma50,
  };
};

// Calculate Simple Moving Average
const calculateSMA = (prices: number[], period: number): number[] => {
  const sma: number[] = [];
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      sma.push(NaN);
    } else {
      const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      sma.push(Math.round((sum / period) * 100) / 100);
    }
  }
  return sma;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  const type = searchParams.get('type'); // 'quote' or 'chart'
  
  if (!symbol) {
    return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
  }

  try {
    if (type === 'chart') {
      // Return chart data
      const chartData = generateFallbackChartData(symbol);
      return NextResponse.json(chartData);
    } else {
      // Return quote data
      const quoteData = generateFallbackStockData(symbol);
      return NextResponse.json(quoteData);
    }
  } catch (error) {
    console.error('Error fetching stock data:', error);
    return NextResponse.json({ error: 'Failed to fetch stock data' }, { status: 500 });
  }
}
