'use client';

import Link from 'next/link';

export default function GamesNavigation() {
  return (
    <div className="bg-gradient-to-r from-purple-900/80 to-blue-900/80 backdrop-blur-sm border border-purple-500/30 rounded-2xl p-6 mb-8">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">🎮 Business Games</h2>
        <p className="text-purple-200">Choose your business adventure</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link 
          href="/games/investment"
          className="group bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 rounded-xl p-4 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-blue-500/25"
        >
          <div className="flex items-center space-x-3">
            <div className="text-3xl">🏢</div>
            <div>
              <h3 className="font-bold text-white group-hover:text-blue-100">Business Empire</h3>
              <p className="text-blue-100 text-sm">Strategic investment simulation</p>
            </div>
          </div>
        </Link>
        
        <Link 
          href="/games/stock-trading"
          className="group bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 rounded-xl p-4 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-green-500/25"
        >
          <div className="flex items-center space-x-3">
            <div className="text-3xl">📈</div>
            <div>
              <h3 className="font-bold text-white group-hover:text-green-100">Stock Trading</h3>
              <p className="text-green-100 text-sm">NASDAQ trading simulator</p>
            </div>
          </div>
        </Link>
      </div>
      
      <div className="text-center mt-4">
        <Link 
          href="/games"
          className="inline-block bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors text-sm"
        >
          View All Games →
        </Link>
      </div>
    </div>
  );
}
