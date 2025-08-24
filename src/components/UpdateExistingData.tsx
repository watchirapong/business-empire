'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';

export default function UpdateExistingData() {
  const { data: session } = useSession();
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const updateExistingData = async () => {
    if (!session?.user) return;

    setIsUpdating(true);
    setMessage(null);
    setError(null);

    try {
      // First try the server-based approach
      let response = await fetch('/api/users/update-existing-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      let data = await response.json();

      if (!response.ok) {
        // If server-based approach fails, try session-based approach
        console.log('Server-based approach failed, trying session-based approach...');
        
        response = await fetch('/api/users/update-session-data', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        data = await response.json();

        if (!response.ok) {
          setError(data.error || 'Failed to update username history');
          return;
        }

        setMessage('✅ Username history updated using session data! Your username changes will now be tracked.');
      } else {
        setMessage('✅ Existing data updated successfully! Your username history is now being tracked.');
      }
      
      // Refresh the page after a short delay to show updated data
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.location.reload();
        }
      }, 2000);

    } catch (error) {
      setError('Failed to update existing data');
      console.error('Error updating existing data:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  if (!session) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-yellow-900/50 to-orange-900/50 backdrop-blur-sm rounded-2xl border border-yellow-500/20 p-6">
      <div className="flex items-start space-x-3">
        <div className="text-yellow-400 text-lg">🔄</div>
        <div className="flex-1">
          <h4 className="text-yellow-400 font-semibold mb-2">Update Existing Data</h4>
          <p className="text-gray-300 text-sm mb-4">
            Your existing server member data doesn&apos;t include username history tracking. 
            Click the button below to fetch your current data from Discord and start tracking username changes.
            If you&apos;re not in the server, it will use your session data instead.
          </p>
          
          {message && (
            <div className="bg-green-600/20 border border-green-500/30 rounded-lg p-3 mb-4">
              <p className="text-green-400 text-sm">{message}</p>
            </div>
          )}
          
          {error && (
            <div className="bg-red-600/20 border border-red-500/30 rounded-lg p-3 mb-4">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
          
          <button
            onClick={updateExistingData}
            disabled={isUpdating}
            className="bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-all duration-300 flex items-center space-x-2"
          >
            <span className="text-lg">{isUpdating ? '⏳' : '🔄'}</span>
            <span>{isUpdating ? 'Updating...' : 'Update Data Now'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
