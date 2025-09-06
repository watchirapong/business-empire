'use client';

import { useState } from 'react';

interface AddHouseProps {
  onHouseAdded: () => void;
}

export default function AddHouse({ onHouseAdded }: AddHouseProps) {
  const [houseName, setHouseName] = useState('');
  const [initialPoints, setInitialPoints] = useState<string>('0');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!houseName.trim()) {
      setError('House name is required');
      return;
    }

    if (houseName.trim().length > 50) {
      setError('House name must be 50 characters or less');
      return;
    }

    const pointsValue = parseInt(initialPoints);
    if (isNaN(pointsValue) || pointsValue < 0) {
      setError('Please enter a valid number of points (0 or greater)');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/admin/houses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          houseName: houseName.trim(),
          initialPoints: pointsValue
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create house');
      }

      setSuccess(`House "${houseName.trim()}" created successfully!`);
      setHouseName('');
      setInitialPoints('0');
      onHouseAdded(); // Refresh the house list
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create house');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-orange-500/20 p-8">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-white">🏠 Add New House</h3>
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

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-gray-300 text-sm font-medium mb-2">
            House Name
          </label>
          <input
            type="text"
            value={houseName}
            onChange={(e) => setHouseName(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-orange-500"
            placeholder="Enter house name (e.g., Phoenix, Dragon, etc.)"
            maxLength={50}
            required
          />
          <p className="text-gray-400 text-xs mt-1">
            {houseName.length}/50 characters
          </p>
        </div>

        <div>
          <label className="block text-gray-300 text-sm font-medium mb-2">
            Initial Points
          </label>
          <input
            type="number"
            value={initialPoints}
            onChange={(e) => setInitialPoints(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-orange-500"
            placeholder="0"
            min="0"
            required
          />
          <p className="text-gray-400 text-xs mt-1">
            Starting points for this house
          </p>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 disabled:from-gray-600 disabled:to-gray-500 disabled:cursor-not-allowed text-white py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg font-medium flex items-center justify-center space-x-2"
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Creating House...</span>
            </>
          ) : (
            <>
              <span className="text-lg">🏠</span>
              <span>Create House</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
