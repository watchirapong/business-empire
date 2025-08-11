'use client';

import { Player, Company } from '../app/page';

interface ResultsProps {
  players: Player[];
  companies: Company[];
  onReset: () => void;
}

export default function Results({ players, companies, onReset }: ResultsProps) {
  // Calculate final results
  const playerResults = players.map(player => {
    let totalValue = 0;
    const investments = Object.entries(player.investments).map(([companyName, invested]) => {
      const company = companies.find(c => c.name === companyName);
      const growth = company?.growth || 0;
      const newValue = invested * (1 + growth / 100);
      totalValue += newValue;
      return { companyName, invested, newValue, growth };
    });

    return {
      ...player,
      totalValue,
      investments
    };
  });

  const winner = playerResults.reduce((prev, current) => 
    prev.totalValue > current.totalValue ? prev : current
  );

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">
          🏆 Game Results
        </h2>
        <p className="text-gray-600">
          Final standings after company growth
        </p>
      </div>

      {/* Winner Announcement */}
      <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl p-6 text-center text-white">
        <div className="text-4xl mb-4">👑</div>
        <h3 className="text-2xl font-bold mb-2">
          Congratulations {winner.name}!
        </h3>
        <p className="text-xl opacity-90">
          Winner with {winner.totalValue.toLocaleString()}฿ total value
        </p>
      </div>

      {/* Company Growth Summary */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">📈 Company Growth</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {companies.map(company => (
            <div key={company.name} className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-gray-800">{company.name}</h4>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  company.growth > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  +{company.growth.toFixed(1)}%
                </span>
              </div>
              <div className="text-sm text-gray-600">
                Total Investment: {company.totalInvestment.toLocaleString()}฿
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Player Results */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-gray-800">💰 Player Results</h3>
        {playerResults
          .sort((a, b) => b.totalValue - a.totalValue)
          .map((player, index) => (
            <div key={player.name} className={`bg-white border-2 rounded-xl p-6 ${
              index === 0 ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                    index === 0 ? 'bg-yellow-500' : 
                    index === 1 ? 'bg-gray-400' : 
                    index === 2 ? 'bg-orange-500' : 'bg-blue-500'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-gray-800">{player.name}</h4>
                    <p className="text-sm text-gray-600">
                      Started with 100,000฿ • Remaining: {player.remainingMoney.toLocaleString()}฿
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-800">
                    {player.totalValue.toLocaleString()}฿
                  </div>
                  <div className="text-sm text-gray-600">
                    Total Value
                  </div>
                </div>
              </div>

              {/* Investment Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {player.investments.map(investment => (
                  <div key={investment.companyName} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-gray-800">{investment.companyName}</span>
                      <span className="text-xs text-gray-600">+{investment.growth.toFixed(1)}%</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      {investment.invested.toLocaleString()}฿ → {investment.newValue.toLocaleString()}฿
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
      </div>

      {/* Game Statistics */}
      <div className="bg-blue-50 rounded-xl p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">📊 Game Statistics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-600">{players.length}</div>
            <div className="text-sm text-blue-600">Players</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">{companies.length}</div>
            <div className="text-sm text-green-600">Companies</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-600">
              {companies.reduce((sum, company) => sum + company.totalInvestment, 0).toLocaleString()}฿
            </div>
            <div className="text-sm text-purple-600">Total Invested</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-orange-600">
              {Math.max(...companies.map(c => c.growth)).toFixed(1)}%
            </div>
            <div className="text-sm text-orange-600">Max Growth</div>
          </div>
        </div>
      </div>

      {/* Reset Button */}
      <div className="text-center">
        <button
          onClick={onReset}
          className="px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          🎮 Play Again
        </button>
      </div>
    </div>
  );
}
