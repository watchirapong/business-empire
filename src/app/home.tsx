'use client';

import { useState } from 'react';
import StockTradingGame from '../components/StockTradingGame';
import UserProfile from '../components/UserProfile';

export default function HomePage() {
  const [selectedGame, setSelectedGame] = useState<string | null>(null);

  const handleGameSelect = (gameType: string) => {
    setSelectedGame(gameType);
  };

  const handleBackToHome = () => {
    setSelectedGame(null);
  };

  // If no game is selected, show game selection
  if (!selectedGame) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.3),transparent_50%)]"></div>
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>

        <div className="relative z-10 container mx-auto px-4 py-8 sm:py-12 md:py-16">
          {/* Header with User Profile */}
          <div className="flex justify-between items-center mb-8">
            <div className="text-white text-lg font-semibold">
              🎮 Game Hub
            </div>
            <UserProfile />
          </div>

          {/* Game Title */}
          <div className="text-center mb-8 sm:mb-12">
            <div className="inline-block bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 text-transparent bg-clip-text">
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black mb-2 sm:mb-4 tracking-tight leading-tight">
                🎮 GAME HUB
              </h1>
            </div>
            <div className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              <p className="text-lg sm:text-xl md:text-2xl font-semibold mb-1 sm:mb-2">
                เลือกเกมที่คุณต้องการเล่น
              </p>
            </div>
          </div>

          {/* Game Selection */}
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              
              {/* Business Empire Game */}
              <div 
                className="group relative bg-gradient-to-br from-blue-900/50 to-cyan-900/50 rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-blue-500/30 hover:border-blue-400/60 transition-all duration-500 cursor-pointer transform hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/25"
                onClick={() => handleGameSelect('business-empire')}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-2xl sm:rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative z-10">
                  <div className="text-5xl sm:text-6xl md:text-7xl mb-6 animate-pulse">🏢</div>
                  <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-blue-300 mb-4 group-hover:text-blue-200 transition-colors">
                    Business Empire
                  </h3>
                  <p className="text-blue-200 text-sm sm:text-base md:text-lg mb-6">
                    เกมจำลองการลงทุนเชิงกลยุทธ์ - ลงทุนในบริษัทและแข่งขันกับผู้เล่นอื่น
                  </p>
                  <div className="space-y-2 text-blue-300/80 text-sm">
                    <div className="flex items-center">
                      <span className="text-blue-400 mr-2">💰</span>
                      <span>เงินทุนเริ่มต้น: 100,000฿</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-blue-400 mr-2">🏢</span>
                      <span>ลงทุนในบริษัทต่างๆ</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-blue-400 mr-2">📈</span>
                      <span>แข่งขันแบบเรียลไทม์</span>
                    </div>
                  </div>
                  <div className="mt-6 text-center">
                    <div className="inline-block px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold rounded-xl group-hover:from-blue-500 group-hover:to-cyan-500 transition-all duration-300 transform group-hover:scale-105 text-sm sm:text-base">
                      เลือกเกมนี้
                    </div>
                  </div>
                </div>
              </div>

              {/* Stock Trading Game */}
              <div 
                className="group relative bg-gradient-to-br from-green-900/50 to-emerald-900/50 rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-green-500/30 hover:border-green-400/60 transition-all duration-500 cursor-pointer transform hover:scale-105 hover:shadow-2xl hover:shadow-green-500/25"
                onClick={() => handleGameSelect('stock-trading')}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-2xl sm:rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative z-10">
                  <div className="text-5xl sm:text-6xl md:text-7xl mb-6 animate-pulse">📈</div>
                  <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-green-300 mb-4 group-hover:text-green-200 transition-colors">
                    Stock Trading Simulator
                  </h3>
                  <p className="text-green-200 text-sm sm:text-base md:text-lg mb-6">
                    เกมจำลองการซื้อขายหุ้น NASDAQ - ซื้อขายหุ้นจริงด้วยเงิน 100,000 USD
                  </p>
                  <div className="space-y-2 text-green-300/80 text-sm">
                    <div className="flex items-center">
                      <span className="text-green-400 mr-2">💰</span>
                      <span>เงินทุนเริ่มต้น: $100,000</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-green-400 mr-2">📊</span>
                      <span>ราคาหุ้นจริงจาก NASDAQ</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-green-400 mr-2">📈</span>
                      <span>กราฟราคาแบบเรียลไทม์</span>
                    </div>
                  </div>
                  <div className="mt-6 text-center">
                    <div className="inline-block px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-xl group-hover:from-green-500 group-hover:to-emerald-500 transition-all duration-300 transform group-hover:scale-105 text-sm sm:text-base">
                      เลือกเกมนี้
                    </div>
                  </div>
                </div>
              </div>

              {/* TCAS Analysis */}
              <div 
                className="group relative bg-gradient-to-br from-blue-900/50 to-indigo-900/50 rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-blue-500/30 hover:border-blue-400/60 transition-all duration-500 cursor-pointer transform hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/25"
                onClick={() => window.location.href = '/tcas-analysis'}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-2xl sm:rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative z-10">
                  <div className="text-5xl sm:text-6xl md:text-7xl mb-6 animate-pulse">🎓</div>
                  <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-blue-300 mb-4 group-hover:text-blue-200 transition-colors">
                    TCAS Analysis
                  </h3>
                  <p className="text-blue-200 text-sm sm:text-base md:text-lg mb-6">
                    วิเคราะห์ข้อมูล TCAS 68 - มหาวิทยาลัยและคณะคอมพิวเตอร์ในไทย
                  </p>
                  <div className="space-y-2 text-blue-300/80 text-sm">
                    <div className="flex items-center">
                      <span className="text-blue-400 mr-2">🏫</span>
                      <span>ข้อมูลมหาวิทยาลัยทั้งหมด</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-blue-400 mr-2">💻</span>
                      <span>คณะคอมพิวเตอร์ในไทย</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-blue-400 mr-2">📊</span>
                      <span>วิเคราะห์รอบ 1,2,3,4</span>
                    </div>
                  </div>
                  <div className="mt-6 text-center">
                    <div className="inline-block px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl group-hover:from-blue-500 group-hover:to-indigo-500 transition-all duration-300 transform group-hover:scale-105 text-sm sm:text-base">
                      ดูข้อมูล
                    </div>
                  </div>
                </div>
              </div>

              {/* Add More Games Here */}
              <div className="group relative bg-gradient-to-br from-gray-900/50 to-slate-900/50 rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-gray-500/30 hover:border-gray-400/60 transition-all duration-500 cursor-pointer transform hover:scale-105">
                <div className="relative z-10">
                  <div className="text-5xl sm:text-6xl md:text-7xl mb-6 animate-pulse">➕</div>
                  <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-300 mb-4">
                    เพิ่มเกมใหม่
                  </h3>
                  <p className="text-gray-200 text-sm sm:text-base md:text-lg mb-6">
                    พร้อมสำหรับเกมใหม่ที่จะเพิ่มเข้ามาในอนาคต
                  </p>
                  <div className="space-y-2 text-gray-300/80 text-sm">
                    <div className="flex items-center">
                      <span className="text-gray-400 mr-2">🎮</span>
                      <span>เกมหลากหลายประเภท</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-gray-400 mr-2">🌟</span>
                      <span>ประสบการณ์ใหม่</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-gray-400 mr-2">🚀</span>
                      <span>อัปเดตอย่างต่อเนื่อง</span>
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

  // If stock trading is selected, show the stock trading game
  if (selectedGame === 'stock-trading') {
    return <StockTradingGame onBackToHome={handleBackToHome} />;
  }

  // Business Empire Game - Redirect to main page
  if (selectedGame === 'business-empire') {
    // Redirect to the main game page
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
    return null;
  }

  return null;
}
