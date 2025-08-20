'use client';

import { useRouter } from 'next/navigation';
import StockTradingGame from '../components/StockTradingGame';
import UserProfile from '../components/UserProfile';

export default function HomePage() {
  const router = useRouter();

  const handleGameSelect = (gameType: string) => {
    if (gameType === 'business-empire') {
      router.push('/business-empire');
    } else if (gameType === 'stock-trading') {
      // For now, just show the stock trading game component
      // You can create a separate route for this later
      console.log('Stock trading selected');
    } else if (gameType === 'shop') {
      router.push('/shop');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(249,115,22,0.1),transparent_50%)]"></div>
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-400/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white/5 rounded-full blur-2xl animate-pulse delay-500"></div>
        </div>

        <div className="relative z-10 container mx-auto px-4 py-8 sm:py-12 md:py-16">
          {/* Header with User Profile and Login */}
          <div className="flex justify-between items-center mb-12">
            <div className="flex items-center space-x-4">
              <div className="text-4xl animate-bounce">🏠</div>
              <div className="text-white text-2xl font-bold bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
                HamsterHub
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => router.push('/api/auth/signin?callbackUrl=/')}
                className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white px-8 py-3 rounded-xl font-bold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-orange-500/25 flex items-center space-x-2"
              >
                <span className="text-xl">🔐</span>
                <span>เข้าสู่ระบบ</span>
              </button>
              <UserProfile />
            </div>
          </div>

          {/* Game Title */}
          <div className="text-center mb-12 sm:mb-16">
            <div className="inline-block bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 text-transparent bg-clip-text">
              <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black mb-4 sm:mb-6 tracking-tight leading-tight animate-pulse">
                🎮 GAME HUB
              </h1>
            </div>
            <div className="bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
              <p className="text-xl sm:text-2xl md:text-3xl font-bold mb-2 sm:mb-4">
                เลือกเกมที่คุณต้องการเล่น
              </p>
            </div>
            <div className="flex justify-center space-x-4 mt-6">
              <div className="w-3 h-3 bg-orange-400 rounded-full animate-bounce"></div>
              <div className="w-3 h-3 bg-orange-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
              <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
            </div>
          </div>

          {/* Game Selection */}
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              
              {/* Business Empire Game */}
              <div 
                className="group relative bg-gradient-to-br from-gray-900/50 to-black/50 rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-orange-500/30 hover:border-orange-400/60 transition-all duration-500 cursor-pointer transform hover:scale-105 hover:shadow-2xl hover:shadow-orange-500/25"
                onClick={() => handleGameSelect('business-empire')}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-orange-600/10 rounded-2xl sm:rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative z-10">
                  <div className="text-5xl sm:text-6xl md:text-7xl mb-6 animate-pulse">🏢</div>
                  <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-orange-300 mb-4 group-hover:text-orange-200 transition-colors">
                    Business Empire
                  </h3>
                  <p className="text-orange-200 text-sm sm:text-base md:text-lg mb-6">
                    เกมจำลองการลงทุนเชิงกลยุทธ์ - ลงทุนในบริษัทและแข่งขันกับผู้เล่นอื่น
                  </p>
                  <div className="space-y-2 text-orange-300/80 text-sm">
                    <div className="flex items-center">
                      <span className="text-orange-400 mr-2">💰</span>
                      <span>เงินทุนเริ่มต้น: 100,000฿</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-orange-400 mr-2">🏢</span>
                      <span>ลงทุนในบริษัทต่างๆ</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-orange-400 mr-2">📈</span>
                      <span>แข่งขันแบบเรียลไทม์</span>
                    </div>
                  </div>
                  <div className="mt-6 text-center">
                    <div className="inline-block px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-500 text-white font-bold rounded-xl group-hover:from-orange-500 group-hover:to-orange-400 transition-all duration-300 transform group-hover:scale-105 text-sm sm:text-base">
                      เลือกเกมนี้
                    </div>
                  </div>
                </div>
              </div>

              {/* Stock Trading Game */}
              <div 
                className="group relative bg-gradient-to-br from-gray-900/50 to-black/50 rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-white/30 hover:border-white/60 transition-all duration-500 cursor-pointer transform hover:scale-105 hover:shadow-2xl hover:shadow-white/25"
                onClick={() => handleGameSelect('stock-trading')}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-gray-300/10 rounded-2xl sm:rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative z-10">
                  <div className="text-5xl sm:text-6xl md:text-7xl mb-6 animate-pulse">📈</div>
                  <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-4 group-hover:text-gray-200 transition-colors">
                    Stock Trading Simulator
                  </h3>
                  <p className="text-gray-200 text-sm sm:text-base md:text-lg mb-6">
                    เกมจำลองการซื้อขายหุ้น NASDAQ - ซื้อขายหุ้นจริงด้วยเงิน 100,000 USD
                  </p>
                  <div className="space-y-2 text-gray-300/80 text-sm">
                    <div className="flex items-center">
                      <span className="text-white mr-2">💰</span>
                      <span>เงินทุนเริ่มต้น: $100,000</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-white mr-2">📊</span>
                      <span>ราคาหุ้นจริงจาก NASDAQ</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-white mr-2">📈</span>
                      <span>กราฟราคาแบบเรียลไทม์</span>
                    </div>
                  </div>
                  <div className="mt-6 text-center">
                    <div className="inline-block px-6 py-3 bg-gradient-to-r from-gray-600 to-white text-black font-bold rounded-xl group-hover:from-gray-500 group-hover:to-gray-300 transition-all duration-300 transform group-hover:scale-105 text-sm sm:text-base">
                      เลือกเกมนี้
                    </div>
                  </div>
                </div>
              </div>

              {/* Hamster Shop */}
              <div 
                className="group relative bg-gradient-to-br from-gray-900/50 to-black/50 rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-orange-500/30 hover:border-orange-400/60 transition-all duration-500 cursor-pointer transform hover:scale-105 hover:shadow-2xl hover:shadow-orange-500/25"
                onClick={() => handleGameSelect('shop')}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-orange-600/10 rounded-2xl sm:rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative z-10">
                  <div className="text-5xl sm:text-6xl md:text-7xl mb-6 animate-pulse">🐹</div>
                  <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-orange-300 mb-4 group-hover:text-orange-200 transition-colors">
                    Hamster Shop
                  </h3>
                  <p className="text-orange-200 text-sm sm:text-base md:text-lg mb-6">
                    ร้านค้าสำหรับแฮมสเตอร์ - หาซื้ออาหาร ของเล่น และอุปกรณ์ต่างๆ
                  </p>
                  <div className="space-y-2 text-orange-300/80 text-sm">
                    <div className="flex items-center">
                      <span className="text-orange-400 mr-2">🛒</span>
                      <span>สินค้าหลากหลายประเภท</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-orange-400 mr-2">🥜</span>
                      <span>อาหารและของเล่นคุณภาพ</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-orange-400 mr-2">🏠</span>
                      <span>อุปกรณ์ที่อยู่อาศัย</span>
                    </div>
                  </div>
                  <div className="mt-6 text-center">
                    <div className="inline-block px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-500 text-white font-bold rounded-xl group-hover:from-orange-500 group-hover:to-orange-400 transition-all duration-300 transform group-hover:scale-105 text-sm sm:text-base">
                      เข้าชมร้าน
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    );
}
