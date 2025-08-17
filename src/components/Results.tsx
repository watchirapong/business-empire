'use client';

import { Player, Company } from '../types';

interface ResultsProps {
  players: Player[];
  companies: Company[];
  onReset: () => void;
}

export default function Results({ players, companies, onReset }: ResultsProps) {
  // Find the winner
  const winner = players.reduce((prev, current) => 
    (current.finalValue || 0) > (prev.finalValue || 0) ? current : prev
  );

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white mb-4">🏆 ผลลัพธ์เกม</h2>
        <button
          onClick={onReset}
          className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-xl font-semibold transition-all duration-200 hover:scale-105"
        >
          🎮 เล่นอีกครั้ง
        </button>
      </div>

      {/* Winner */}
      <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-400/50 rounded-xl p-6">
        <div className="text-center">
          <div className="text-6xl mb-4">👑</div>
          <h3 className="text-2xl font-bold text-yellow-400">
            ผู้ชนะ: {winner.name}
          </h3>
          <p className="text-yellow-300 mt-2">
            มูลค่าสุดท้าย: {(winner.finalValue || 0).toLocaleString()}฿
          </p>
        </div>
      </div>

      {/* Player Rankings */}
      <div className="bg-white/5 rounded-xl p-6 border border-white/10">
        <h3 className="text-2xl font-bold text-white mb-6 flex items-center">
          <span className="mr-3">🏅</span> อันดับผู้เล่น
        </h3>
        
        <div className="space-y-3">
          {players
            .sort((a, b) => (b.finalValue || 0) - (a.finalValue || 0))
            .map((player, index) => {
              const totalInvested = Object.values(player.investments || {}).reduce((sum, val) => sum + val, 0);
              const profit = (player.finalValue || 0) - totalInvested;
              const profitPercentage = totalInvested > 0 ? (profit / totalInvested) * 100 : 0;
              
              return (
                <div key={player.id} className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl p-4 border border-white/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${
                        index === 0 ? 'bg-gradient-to-r from-yellow-400 to-orange-500' : 
                        index === 1 ? 'bg-gradient-to-r from-gray-400 to-gray-600' : 
                        index === 2 ? 'bg-gradient-to-r from-orange-400 to-red-500' : 'bg-gradient-to-r from-blue-400 to-purple-500'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <div className="text-white font-semibold text-lg">{player.name}</div>
                        <div className="text-gray-400 text-sm">
                          ลงทุน: {totalInvested.toLocaleString()}฿
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-white font-bold text-xl">
                        {(player.finalValue || 0).toLocaleString()}฿
                      </div>
                      <div className={`text-sm ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {profit >= 0 ? '+' : ''}{profit.toLocaleString()}฿ ({profitPercentage >= 0 ? '+' : ''}{(profitPercentage || 0).toFixed(1)}%)
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Company Analysis */}
      <div className="bg-white/5 rounded-xl p-6 border border-white/10">
        <h3 className="text-2xl font-bold text-white mb-6 flex items-center">
          <span className="mr-3">📊</span> การวิเคราะห์บริษัท
        </h3>
        
        <div className="space-y-4">
          {companies.map((company) => {
            const totalInvestment = company.totalInvestment;
            const growthPercentage = company.growth;
            
            return (
              <div key={company.name} className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl p-6 border border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-xl font-bold text-white">{company.name}</h4>
                  <div className="text-right">
                    <div className="text-sm text-gray-400">การลงทุนรวม</div>
                    <div className="text-green-400 font-bold text-xl">
                      {(totalInvestment || 0).toLocaleString()}฿
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-gray-400 text-sm">อัตราการเติบโต</div>
                    <div className={`font-bold text-xl ${growthPercentage > 0 ? 'text-green-400' : 'text-gray-400'}`}>
                      {(growthPercentage || 0).toFixed(1)}%
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-gray-400 text-sm">ส่วนแบ่งตลาด</div>
                    <div className="text-blue-400 font-bold text-xl">
                      {companies.reduce((sum, c) => sum + c.totalInvestment, 0) > 0 
                        ? ((totalInvestment / companies.reduce((sum, c) => sum + c.totalInvestment, 0)) * 100).toFixed(1)
                        : '0'}%
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-gray-400 text-sm">มูลค่าสุดท้าย</div>
                    <div className="text-purple-400 font-bold text-xl">
                      {(totalInvestment * (1 + growthPercentage / 100)).toLocaleString()}฿
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
