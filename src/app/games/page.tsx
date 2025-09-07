import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Business Games Hub',
  description: 'Play business simulation games including stock trading, forex trading, crypto trading, and investment games. Real-time trading simulators with NASDAQ data and competitive leaderboards.',
  keywords: [
    'business games',
    'stock trading simulator',
    'forex trading game',
    'crypto trading simulator',
    'investment games',
    'NASDAQ simulator',
    'trading competition',
    'business simulation',
    'financial games'
  ],
  openGraph: {
    title: 'Business Games Hub - Trading & Investment Simulators',
    description: 'Experience realistic trading with our stock, forex, and crypto simulators. Compete with other players and build your financial empire.',
    images: [
      {
        url: '/hamsterhub-logo.png',
        width: 1200,
        height: 630,
        alt: 'Business Games Hub - Trading Simulators',
      },
    ],
  },
  twitter: {
    title: 'Business Games Hub - Trading & Investment Simulators',
    description: 'Experience realistic trading with our stock, forex, and crypto simulators. Compete with other players and build your financial empire.',
  },
};

export default function GamesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-purple-900">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">🎮 Business Games Hub</h1>
          <p className="text-purple-200 text-xl">Choose your business adventure</p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Business Empire Game */}
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-8 shadow-2xl hover:shadow-blue-500/25 transition-all duration-300 transform hover:scale-105">
            <div className="text-center">
              <div className="text-6xl mb-4">🏢</div>
              <h2 className="text-3xl font-bold text-white mb-4">Business Empire</h2>
              <p className="text-blue-100 mb-6 text-lg">
                เกมจำลองการลงทุนเชิงกลยุทธ์ - ลงทุนในบริษัทและแข่งขันกับผู้เล่นอื่น
              </p>
              <Link 
                href="/games/investment"
                className="inline-block bg-white text-blue-600 px-8 py-3 rounded-xl font-bold hover:bg-blue-50 transition-colors shadow-lg"
              >
                Start Investing
              </Link>
            </div>
          </div>
          
          {/* Stock Trading Game */}
          <div className="bg-gradient-to-br from-green-600 to-green-800 rounded-2xl p-8 shadow-2xl hover:shadow-green-500/25 transition-all duration-300 transform hover:scale-105">
            <div className="text-center">
              <div className="text-6xl mb-4">📈</div>
              <h2 className="text-3xl font-bold text-white mb-4">Stock Trading Simulator</h2>
              <p className="text-green-100 mb-6 text-lg">
                เกมจำลองการซื้อขายหุ้น NASDAQ - ซื้อขายหุ้นจริงด้วยเงิน 100,000 USD
              </p>
              <Link 
                href="/games/stock-trading"
                className="inline-block bg-white text-green-600 px-8 py-3 rounded-xl font-bold hover:bg-green-50 transition-colors shadow-lg"
              >
                Start Trading
              </Link>
            </div>
          </div>

          {/* Forex Trading Game */}
          <div className="bg-gradient-to-br from-orange-600 to-orange-800 rounded-2xl p-8 shadow-2xl hover:shadow-orange-500/25 transition-all duration-300 transform hover:scale-105">
            <div className="text-center">
              <div className="text-6xl mb-4">💱</div>
              <h2 className="text-3xl font-bold text-white mb-4">Forex Trading Simulator</h2>
              <p className="text-orange-100 mb-6 text-lg">
                เกมจำลองการซื้อขายสกุลเงิน - เทรดคู่สกุลเงินหลักด้วยเงิน 50,000 USD
              </p>
              <Link 
                href="/games/forex-trading"
                className="inline-block bg-white text-orange-600 px-8 py-3 rounded-xl font-bold hover:bg-orange-50 transition-colors shadow-lg"
              >
                Start Trading
              </Link>
            </div>
          </div>

          {/* Crypto Trading Game */}
          <div className="bg-gradient-to-br from-yellow-600 to-yellow-800 rounded-2xl p-8 shadow-2xl hover:shadow-yellow-500/25 transition-all duration-300 transform hover:scale-105">
            <div className="text-center">
              <div className="text-6xl mb-4">₿</div>
              <h2 className="text-3xl font-bold text-white mb-4">Crypto Trading Simulator</h2>
              <p className="text-yellow-100 mb-6 text-lg">
                เกมจำลองการซื้อขายคริปโต - เทรด Bitcoin, Ethereum และเหรียญอื่นๆ
              </p>
              <Link 
                href="/games/crypto-trading"
                className="inline-block bg-white text-yellow-600 px-8 py-3 rounded-xl font-bold hover:bg-yellow-50 transition-colors shadow-lg"
              >
                Start Trading
              </Link>
            </div>
          </div>

          {/* Unified Trading Dashboard */}
          <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl p-8 shadow-2xl hover:shadow-indigo-500/25 transition-all duration-300 transform hover:scale-105">
            <div className="text-center">
              <div className="text-6xl mb-4">🎯</div>
              <h2 className="text-3xl font-bold text-white mb-4">Unified Trading Dashboard</h2>
              <p className="text-indigo-100 mb-6 text-lg">
                Trade stocks, forex, and crypto with shared capital - All linked to your Discord account
              </p>
              <Link 
                href="/games/unified-trading"
                className="inline-block bg-white text-indigo-600 px-8 py-3 rounded-xl font-bold hover:bg-indigo-50 transition-colors shadow-lg"
              >
                Open Dashboard
              </Link>
            </div>
          </div>
        </div>
        
        <div className="text-center mt-12">
          <Link 
            href="/"
            className="inline-block bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            ← Back to HamsterHub
          </Link>
        </div>
      </div>
    </div>
  );
}