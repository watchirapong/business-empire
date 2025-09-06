'use client';

import { useState, useEffect } from 'react';
import HousePointsManager from './HousePointsManager';
import AddHouse from './AddHouse';

interface HouseData {
  _id: string;
  houseName: string;
  points: number;
  lastUpdated: string;
  updatedBy: string;
  updateReason: string;
}

export default function HouseManager() {
  const [houses, setHouses] = useState<HouseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'manage' | 'add'>('manage');

  const fetchHouses = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/admin/houses');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch houses');
      }
      
      setHouses(data.houses);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fetch houses');
      console.error('Error fetching houses:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHouses();
  }, []);

  const handleHouseAdded = () => {
    fetchHouses(); // Refresh the house list
  };

  const handleDeleteHouse = async (houseName: string) => {
    if (!confirm(`Are you sure you want to delete the house "${houseName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/houses?houseName=${encodeURIComponent(houseName)}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete house');
      }

      alert(`House "${houseName}" deleted successfully!`);
      fetchHouses(); // Refresh the house list
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to delete house');
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-orange-500/20 p-8">
        <div className="text-center">
          <div className="text-2xl mb-4">⏳</div>
          <h3 className="text-xl font-bold text-white mb-2">House Manager</h3>
          <p className="text-gray-400">Loading houses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-orange-500/20 p-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-white">🏠 House Manager</h3>
          <button
            onClick={fetchHouses}
            className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
          >
            <span>🔄</span>
            <span>Refresh</span>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-4 mb-6">
          <button
            onClick={() => setActiveTab('manage')}
            className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
              activeTab === 'manage'
                ? 'bg-orange-600 text-white shadow-lg'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            📊 Manage Houses
          </button>
          <button
            onClick={() => setActiveTab('add')}
            className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
              activeTab === 'add'
                ? 'bg-orange-600 text-white shadow-lg'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            ➕ Add House
          </button>
        </div>

        {/* Current Houses List */}
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-white mb-4">Current Houses ({houses.length})</h4>
          {houses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {houses.map((house) => (
                <div
                  key={house._id}
                  className="bg-gray-800/50 border border-gray-600 rounded-lg p-4 flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">🏠</div>
                    <div>
                      <div className="text-white font-semibold">{house.houseName}</div>
                      <div className="text-gray-400 text-sm">{house.points.toLocaleString()} points</div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteHouse(house.houseName)}
                    className="bg-red-600 hover:bg-red-500 text-white px-3 py-1 rounded text-sm transition-colors"
                    title={`Delete ${house.houseName}`}
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">🏠</div>
              <h3 className="text-xl font-semibold text-white mb-2">No Houses Found</h3>
              <p className="text-gray-400">Create your first house to get started!</p>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-600/20 border border-red-500/30 rounded-lg p-4">
            <h4 className="text-red-400 font-semibold mb-2">Error:</h4>
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}
      </div>

      {/* Tab Content */}
      {activeTab === 'manage' && <HousePointsManager />}
      {activeTab === 'add' && <AddHouse onHouseAdded={handleHouseAdded} />}
    </div>
  );
}
