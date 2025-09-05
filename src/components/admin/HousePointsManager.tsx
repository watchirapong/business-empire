'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface HouseData {
  _id: string;
  houseName: string;
  points: number;
  lastUpdated: string;
  updatedBy: string;
  updateReason: string;
}

export default function HousePointsManager() {
  const { data: session } = useSession();
  const [houses, setHouses] = useState<HouseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Form states
  const [selectedHouse, setSelectedHouse] = useState<string>('');
  const [points, setPoints] = useState<string>('');
  const [pointsToAdd, setPointsToAdd] = useState<string>('');
  const [updateReason, setUpdateReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchHousePoints = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/admin/house-points');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch house points');
      }
      
      setHouses(data.houses);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fetch house points');
      console.error('Error fetching house points:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHousePoints();
  }, []);

  const handleSetPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedHouse || points === '') {
      setError('Please select a house and enter points');
      return;
    }

    const pointsValue = parseInt(points);
    if (isNaN(pointsValue) || pointsValue < 0) {
      setError('Please enter a valid number of points');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/admin/house-points', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          houseName: selectedHouse,
          points: pointsValue,
          updateReason: updateReason || 'Manual update'
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update house points');
      }

      setSuccess(`Successfully set ${selectedHouse} points to ${pointsValue}`);
      setPoints('');
      setUpdateReason('');
      fetchHousePoints();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update house points');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedHouse || pointsToAdd === '') {
      setError('Please select a house and enter points to add');
      return;
    }

    const pointsValue = parseInt(pointsToAdd);
    if (isNaN(pointsValue)) {
      setError('Please enter a valid number of points');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/admin/house-points', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          houseName: selectedHouse,
          pointsToAdd: pointsValue,
          updateReason: updateReason || 'Points added'
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add house points');
      }

      setSuccess(`Successfully added ${pointsValue} points to ${selectedHouse}`);
      setPointsToAdd('');
      setUpdateReason('');
      fetchHousePoints();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to add house points');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getHouseColor = (houseName: string) => {
    switch (houseName) {
      case 'Selene':
        return 'border-blue-500 bg-blue-500/10';
      case 'Pleiades':
        return 'border-purple-500 bg-purple-500/10';
      case 'Ophira':
        return 'border-green-500 bg-green-500/10';
      default:
        return 'border-gray-500 bg-gray-500/10';
    }
  };

  const getHouseEmoji = (houseName: string) => {
    switch (houseName) {
      case 'Selene':
        return '🌙';
      case 'Pleiades':
        return '⭐';
      case 'Ophira':
        return '🌿';
      default:
        return '🏠';
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-orange-500/20 p-8">
        <div className="text-center">
          <div className="text-2xl mb-4">⏳</div>
          <h3 className="text-xl font-bold text-white mb-2">House Points Manager</h3>
          <p className="text-gray-400">Loading house data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-orange-500/20 p-8">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-white">🏆 House Points Manager</h3>
        <button
          onClick={fetchHousePoints}
          className="bg-orange-600 hover:bg-orange-500 text-white px-3 py-1 rounded text-sm transition-colors"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-600/20 border border-red-500/30 rounded-lg p-4 mb-6">
          <h4 className="text-red-400 font-semibold mb-2">Error:</h4>
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-600/20 border border-green-500/30 rounded-lg p-4 mb-6">
          <h4 className="text-green-400 font-semibold mb-2">Success:</h4>
          <p className="text-green-300 text-sm">{success}</p>
        </div>
      )}

      {/* Current House Points Display */}
      <div className="mb-8">
        <h4 className="text-lg font-semibold text-white mb-4">Current House Points</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {houses.map((house) => (
            <div
              key={house._id}
              className={`border-2 ${getHouseColor(house.houseName)} rounded-lg p-4`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">{getHouseEmoji(house.houseName)}</span>
                  <span className="text-white font-semibold">{house.houseName}</span>
                </div>
              </div>
              <div className="text-2xl font-bold text-white mb-1">
                {house.points.toLocaleString()}
              </div>
              <div className="text-gray-400 text-sm">
                Last updated: {new Date(house.lastUpdated).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Set Points Form */}
      <div className="mb-8">
        <h4 className="text-lg font-semibold text-white mb-4">Set House Points</h4>
        <form onSubmit={handleSetPoints} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Select House
              </label>
              <select
                value={selectedHouse}
                onChange={(e) => setSelectedHouse(e.target.value)}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-orange-500"
                required
              >
                <option value="">Choose a house</option>
                <option value="Selene">🌙 Selene</option>
                <option value="Pleiades">⭐ Pleiades</option>
                <option value="Ophira">🌿 Ophira</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Points
              </label>
              <input
                type="number"
                value={points}
                onChange={(e) => setPoints(e.target.value)}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-orange-500"
                placeholder="Enter points"
                min="0"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">
              Update Reason (Optional)
            </label>
            <input
              type="text"
              value={updateReason}
              onChange={(e) => setUpdateReason(e.target.value)}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-orange-500"
              placeholder="Reason for update"
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg transition-colors"
          >
            {isSubmitting ? 'Setting...' : 'Set Points'}
          </button>
        </form>
      </div>

      {/* Add Points Form */}
      <div>
        <h4 className="text-lg font-semibold text-white mb-4">Add Points to House</h4>
        <form onSubmit={handleAddPoints} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Select House
              </label>
              <select
                value={selectedHouse}
                onChange={(e) => setSelectedHouse(e.target.value)}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-orange-500"
                required
              >
                <option value="">Choose a house</option>
                <option value="Selene">🌙 Selene</option>
                <option value="Pleiades">⭐ Pleiades</option>
                <option value="Ophira">🌿 Ophira</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Points to Add
              </label>
              <input
                type="number"
                value={pointsToAdd}
                onChange={(e) => setPointsToAdd(e.target.value)}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-orange-500"
                placeholder="Enter points to add"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">
              Update Reason (Optional)
            </label>
            <input
              type="text"
              value={updateReason}
              onChange={(e) => setUpdateReason(e.target.value)}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-orange-500"
              placeholder="Reason for adding points"
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-green-600 hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg transition-colors"
          >
            {isSubmitting ? 'Adding...' : 'Add Points'}
          </button>
        </form>
      </div>
    </div>
  );
}
