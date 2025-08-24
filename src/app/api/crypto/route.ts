import { NextResponse } from 'next/server';

const CRYPTO_SYMBOLS = [
  'BTC', 'ETH', 'BNB', 'SOL', 'ADA', 'DOT', 'MATIC', 'LINK', 'AVAX', 'UNI'
];

// Simulated crypto data with realistic prices
const generateCryptoData = () => {
  const basePrices: { [key: string]: { price: number; name: string; marketCap: number } } = {
    'BTC': { price: 43250.67, name: 'Bitcoin', marketCap: 847500000000 },
    'ETH': { price: 2650.89, name: 'Ethereum', marketCap: 318000000000 },
    'BNB': { price: 312.45, name: 'Binance Coin', marketCap: 48100000000 },
    'SOL': { price: 98.76, name: 'Solana', marketCap: 42800000000 },
    'ADA': { price: 0.4856, name: 'Cardano', marketCap: 17200000000 },
    'DOT': { price: 7.23, name: 'Polkadot', marketCap: 9200000000 },
    'MATIC': { price: 0.8765, name: 'Polygon', marketCap: 8500000000 },
    'LINK': { price: 15.67, name: 'Chainlink', marketCap: 9200000000 },
    'AVAX': { price: 36.45, name: 'Avalanche', marketCap: 13400000000 },
    'UNI': { price: 6.78, name: 'Uniswap', marketCap: 5100000000 }
  };

  return CRYPTO_SYMBOLS.map(symbol => {
    const baseData = basePrices[symbol];
    if (!baseData) return null;

    const changePercent = (Math.random() - 0.5) * 10; // -5% to +5%
    const change = (baseData.price * changePercent) / 100;
    const currentPrice = baseData.price + change;
    
    return {
      symbol,
      name: baseData.name,
      price: currentPrice,
      change: change,
      changePercent: changePercent,
      volume: Math.floor(Math.random() * 50000000000) + 1000000000,
      marketCap: baseData.marketCap * (1 + changePercent / 100),
      circulatingSupply: Math.floor(baseData.marketCap / baseData.price)
    };
  }).filter(Boolean);
};

export async function GET() {
  try {
    const cryptoData = generateCryptoData();
    
    return NextResponse.json({
      success: true,
      data: cryptoData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching crypto data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch crypto data' },
      { status: 500 }
    );
  }
}
