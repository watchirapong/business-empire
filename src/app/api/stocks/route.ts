import { NextResponse } from 'next/server';

// Alpha Vantage API (free tier: 25 requests per day)
const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY || 'demo';
const ALPHA_VANTAGE_BASE_URL = 'https://www.alphavantage.co/query';

// Yahoo Finance API alternative (no key required but less reliable)
const YAHOO_FINANCE_BASE_URL = 'https://query1.finance.yahoo.com/v8/finance/chart';

// Fetch real stock data from Yahoo Finance (free, no API key required)
const fetchRealStockData = async (symbol: string) => {
  try {
    const response = await fetch(`${YAHOO_FINANCE_BASE_URL}/${symbol}?interval=1d&range=1d`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    const result = data.chart?.result?.[0];
    
    if (!result) {
      throw new Error('No data found');
    }
    
    const meta = result.meta;
    const currentPrice = meta.regularMarketPrice || meta.previousClose || 0;
    const previousClose = meta.previousClose || meta.chartPreviousClose || currentPrice;
    const change = currentPrice - previousClose;
    const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;
    
    return {
      symbol: symbol,
      name: meta.longName || symbol,
      price: Math.round(currentPrice * 100) / 100,
      change: Math.round(change * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
      volume: meta.regularMarketVolume || 0,
      marketCap: meta.marketCap || 0,
    };
  } catch (error) {
    console.error(`Error fetching real data for ${symbol}:`, error);
    throw error;
  }
};

// Fetch real stock data from Alpha Vantage (requires API key)
const fetchAlphaVantageData = async (symbol: string) => {
  try {
    const response = await fetch(
      `${ALPHA_VANTAGE_BASE_URL}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`
    );
    
    const data = await response.json();
    const quote = data['Global Quote'];
    
    if (!quote) {
      throw new Error('No quote data found');
    }
    
    const currentPrice = parseFloat(quote['05. price']);
    const change = parseFloat(quote['09. change']);
    const changePercent = parseFloat(quote['10. change percent'].replace('%', ''));
    
    return {
      symbol: symbol,
      name: symbol,
      price: Math.round(currentPrice * 100) / 100,
      change: Math.round(change * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
      volume: parseInt(quote['06. volume']) || 0,
      marketCap: 0, // Not available in this endpoint
    };
  } catch (error) {
    console.error(`Error fetching Alpha Vantage data for ${symbol}:`, error);
    throw error;
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
      // For now, return fallback chart data (real-time charts would require more complex integration)
      const chartData = generateFallbackChartData(symbol);
      return NextResponse.json(chartData);
    } else {
      // Try to get real stock data, fallback to simulated data if it fails
      try {
        console.log(`Fetching real stock data for ${symbol}`);
        const realData = await fetchRealStockData(symbol);
        console.log(`Successfully fetched real data for ${symbol}:`, realData);
        return NextResponse.json(realData);
      } catch (realDataError) {
        console.log(`Real data failed for ${symbol}, trying Alpha Vantage...`);
        try {
          const alphaData = await fetchAlphaVantageData(symbol);
          console.log(`Successfully fetched Alpha Vantage data for ${symbol}:`, alphaData);
          return NextResponse.json(alphaData);
        } catch (alphaError) {
          console.log(`All real data sources failed for ${symbol}, using fallback`);
          const fallbackData = generateFallbackStockData(symbol);
          return NextResponse.json({
            ...fallbackData,
            isSimulated: true,
            note: 'Real-time data unavailable, showing simulated prices'
          });
        }
      }
    }
  } catch (error) {
    console.error('Error fetching stock data:', error);
    return NextResponse.json({ error: 'Failed to fetch stock data' }, { status: 500 });
  }
}
