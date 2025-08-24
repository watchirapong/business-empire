import { NextResponse } from 'next/server';

const FOREX_PAIRS = [
  'EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'AUD/USD', 'USD/CAD', 'NZD/USD', 'EUR/GBP'
];

// Simulated forex data with realistic prices
const generateForexData = () => {
  const baseRates: { [key: string]: number } = {
    'EUR/USD': 1.0856,
    'GBP/USD': 1.2647,
    'USD/JPY': 148.23,
    'USD/CHF': 0.8645,
    'AUD/USD': 0.6589,
    'USD/CAD': 1.3542,
    'NZD/USD': 0.6123,
    'EUR/GBP': 0.8589
  };

  return FOREX_PAIRS.map(pair => {
    const baseRate = baseRates[pair] || 1.0;
    const change = (Math.random() - 0.5) * 0.01;
    const currentPrice = baseRate + change;
    const changePercent = (change / baseRate) * 100;
    
    return {
      symbol: pair,
      name: pair.replace('/', ' / '),
      price: currentPrice,
      change: change,
      changePercent: changePercent,
      volume: Math.floor(Math.random() * 1000000000) + 500000000,
      spread: 0.0004,
      bid: currentPrice - 0.0002,
      ask: currentPrice + 0.0002
    };
  });
};

export async function GET() {
  try {
    const forexData = generateForexData();
    
    return NextResponse.json({
      success: true,
      data: forexData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching forex data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch forex data' },
      { status: 500 }
    );
  }
}
