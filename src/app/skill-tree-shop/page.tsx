'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import SkillTree from '@/components/SkillTree';
import { SkillTreeNode } from '@/types/skillTree';

export default function SkillTreeShopPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [selectedNode, setSelectedNode] = useState<SkillTreeNode | null>(null);
  const [showPurchaseSuccess, setShowPurchaseSuccess] = useState(false);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-orange-400 border-t-transparent"></div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔐</div>
          <h1 className="text-3xl font-bold text-white mb-4">Authentication Required</h1>
          <p className="text-gray-400 mb-6">Please log in to access the Skill Tree Shop</p>
          <button
            onClick={() => router.push('/api/auth/signin')}
            className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-6 py-3 rounded-lg font-semibold transition-all"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  const handleNodeClick = (node: SkillTreeNode) => {
    setSelectedNode(node);
  };

  const handlePurchase = (nodeId: string) => {
    setShowPurchaseSuccess(true);
    setTimeout(() => setShowPurchaseSuccess(false), 3000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-600/20 to-orange-500/20 border-b border-orange-500/30">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/')}
                className="text-orange-400 hover:text-orange-300 transition-colors"
              >
                ← Back to Home
              </button>
              <div className="flex items-center space-x-3">
                <div className="text-4xl">🌳</div>
                <div>
                  <h1 className="text-3xl font-bold text-white">Skill Tree Shop</h1>
                  <p className="text-gray-300">Unlock your potential with branching skill paths</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/shop')}
                className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Traditional Shop
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Introduction */}
        <div className="text-center mb-8">
          <div className="bg-gradient-to-r from-orange-500/10 to-orange-600/10 border border-orange-500/20 rounded-2xl p-6 mb-6">
            <h2 className="text-2xl font-bold text-white mb-3">🌳 Skill Tree System</h2>
            <p className="text-gray-300 max-w-3xl mx-auto">
              Progress through interconnected skill branches! Each category is a main branch that splits into specialized sub-branches. 
              Purchase skills to unlock new paths and build your unique character progression.
            </p>
          </div>
        </div>

        {/* Skill Tree Component */}
        <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6">
          <SkillTree onNodeClick={handleNodeClick} onPurchase={handlePurchase} />
        </div>

        {/* Selected Node Details */}
        {selectedNode && (
          <div className="mt-8">
            <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-2xl p-6">
              <div className="flex items-start space-x-4">
                <div className="text-4xl">{selectedNode.icon}</div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-white mb-2">{selectedNode.name}</h3>
                  <p className="text-gray-300 mb-4">{selectedNode.description}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-lg font-semibold text-white mb-2">Details</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Level:</span>
                          <span className="text-white">{selectedNode.level}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Cost:</span>
                          <span className="text-yellow-400 font-semibold">{selectedNode.cost} 🪙</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Status:</span>
                          <span className={`font-semibold ${
                            selectedNode.isPurchased ? 'text-green-400' :
                            selectedNode.isUnlocked ? 'text-yellow-400' : 'text-gray-400'
                          }`}>
                            {selectedNode.isPurchased ? '✓ Purchased' :
                             selectedNode.isUnlocked ? '🔓 Unlocked' : '🔒 Locked'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {selectedNode.benefits && (
                      <div>
                        <h4 className="text-lg font-semibold text-white mb-2">Benefits</h4>
                        <div className="space-y-2">
                          {selectedNode.benefits.statBoosts && Object.entries(selectedNode.benefits.statBoosts).map(([stat, value]) => (
                            <div key={stat} className="flex justify-between">
                              <span className="text-gray-400 capitalize">{stat}:</span>
                              <span className="text-green-400">+{value}</span>
                            </div>
                          ))}
                          {selectedNode.benefits.specialAbilities && (
                            <div>
                              <span className="text-gray-400">Special Abilities:</span>
                              <ul className="text-green-400 text-sm mt-1">
                                {selectedNode.benefits.specialAbilities.map((ability, index) => (
                                  <li key={index}>• {ability}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Purchase Success Message */}
        {showPurchaseSuccess && (
          <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50">
            <div className="flex items-center space-x-2">
              <span className="text-xl">✅</span>
              <span>Skill purchased successfully!</span>
            </div>
          </div>
        )}

        {/* How It Works */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">How the Skill Tree Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-800/50 rounded-xl p-6 text-center">
              <div className="text-4xl mb-4">🌱</div>
              <h3 className="text-xl font-semibold text-white mb-2">Start with Roots</h3>
              <p className="text-gray-300">Begin with the main branch roots (Gaming, Business, Creative, Lifestyle) which are free to unlock.</p>
            </div>
            
            <div className="bg-gray-800/50 rounded-xl p-6 text-center">
              <div className="text-4xl mb-4">🌿</div>
              <h3 className="text-xl font-semibold text-white mb-2">Branch Out</h3>
              <p className="text-gray-300">Purchase skills to unlock new branches. Each purchase opens up new possibilities and paths.</p>
            </div>
            
            <div className="bg-gray-800/50 rounded-xl p-6 text-center">
              <div className="text-4xl mb-4">🌳</div>
              <h3 className="text-xl font-semibold text-white mb-2">Grow Your Tree</h3>
              <p className="text-gray-300">Build your unique skill tree by choosing which branches to develop based on your goals.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
