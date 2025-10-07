'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { SkillTreeData, SkillTreeNode, SkillTreeBranch } from '@/types/skillTree';

interface SkillTreeProps {
  onNodeClick?: (node: SkillTreeNode) => void;
  onPurchase?: (nodeId: string) => void;
}

export default function SkillTree({ onNodeClick, onPurchase }: SkillTreeProps) {
  const { data: session } = useSession();
  const [skillTree, setSkillTree] = useState<SkillTreeData | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string>('gaming');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [balance, setBalance] = useState<{hamstercoin: number}>({hamstercoin: 0});
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Fetch skill tree data
  useEffect(() => {
    const fetchSkillTree = async () => {
      try {
        const response = await fetch('/api/skill-tree');
        if (response.ok) {
          const data = await response.json();
          setSkillTree(data.skillTree);
        } else {
          setError('Failed to load skill tree');
        }
      } catch (err) {
        setError('Failed to load skill tree');
      } finally {
        setLoading(false);
      }
    };

    const fetchBalance = async () => {
      try {
        const response = await fetch('/api/currency/balance');
        if (response.ok) {
          const data = await response.json();
          setBalance(data.balance);
        }
      } catch (err) {
        console.error('Failed to fetch balance:', err);
      }
    };

    if (session?.user) {
      fetchSkillTree();
      fetchBalance();
    }
  }, [session]);

  // Draw skill tree on canvas
  useEffect(() => {
    if (!skillTree || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = 1200;
    canvas.height = 600;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const branch = skillTree.branches.find(b => b.id === selectedBranch);
    if (!branch) return;

    // Draw connections first (behind nodes)
    branch.nodes.forEach(node => {
      if (node.connections) {
        node.connections.forEach(connectionId => {
          const connectedNode = branch.nodes.find(n => n.id === connectionId);
          if (connectedNode) {
            ctx.beginPath();
            ctx.moveTo(node.position.x + 600, node.position.y + 300);
            ctx.lineTo(connectedNode.position.x + 600, connectedNode.position.y + 300);
            ctx.strokeStyle = node.isUnlocked ? '#4CAF50' : '#666';
            ctx.lineWidth = 2;
            ctx.stroke();
          }
        });
      }
    });

    // Draw nodes
    branch.nodes.forEach(node => {
      const x = node.position.x + 600;
      const y = node.position.y + 300;
      const radius = 30;

      // Node background
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      
      if (node.isPurchased) {
        ctx.fillStyle = '#4CAF50';
      } else if (node.isUnlocked) {
        ctx.fillStyle = '#FFC107';
      } else {
        ctx.fillStyle = '#666';
      }
      ctx.fill();

      // Node border
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Node icon
      ctx.font = '20px Arial';
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(node.icon, x, y);

      // Cost label
      if (!node.isPurchased && node.cost > 0) {
        ctx.font = '12px Arial';
        ctx.fillStyle = '#fff';
        ctx.fillText(`${node.cost}🪙`, x, y + 40);
      }
    });
  }, [skillTree, selectedBranch]);

  const handleNodeClick = (node: SkillTreeNode) => {
    if (onNodeClick) {
      onNodeClick(node);
    }
  };

  const handlePurchase = async (nodeId: string) => {
    if (purchasing) return;

    setPurchasing(nodeId);
    try {
      const response = await fetch('/api/skill-tree', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeId, action: 'purchase' })
      });

      if (response.ok) {
        const data = await response.json();
        setBalance(prev => ({ ...prev, hamstercoin: data.newBalance }));
        
        // Refresh skill tree
        const treeResponse = await fetch('/api/skill-tree');
        if (treeResponse.ok) {
          const treeData = await treeResponse.json();
          setSkillTree(treeData.skillTree);
        }

        if (onPurchase) {
          onPurchase(nodeId);
        }
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Purchase failed');
      }
    } catch (err) {
      alert('Purchase failed');
    } finally {
      setPurchasing(null);
    }
  };

  const getNodeAtPosition = (x: number, y: number): SkillTreeNode | null => {
    if (!skillTree) return null;

    const branch = skillTree.branches.find(b => b.id === selectedBranch);
    if (!branch) return null;

    for (const node of branch.nodes) {
      const nodeX = node.position.x + 600;
      const nodeY = node.position.y + 300;
      const distance = Math.sqrt((x - nodeX) ** 2 + (y - nodeY) ** 2);
      
      if (distance <= 30) {
        return node;
      }
    }
    return null;
  };

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const node = getNodeAtPosition(x, y);
    if (node) {
      handleNodeClick(node);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-orange-400 border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-400 p-8">
        <p>{error}</p>
      </div>
    );
  }

  if (!skillTree) {
    return (
      <div className="text-center text-gray-400 p-8">
        <p>No skill tree data available</p>
      </div>
    );
  }

  const currentBranch = skillTree.branches.find(b => b.id === selectedBranch);

  return (
    <div className="w-full">
      {/* Branch Selector */}
      <div className="flex justify-center mb-6">
        <div className="flex space-x-2 bg-gray-800/50 rounded-lg p-2">
          {skillTree.branches.map(branch => (
            <button
              key={branch.id}
              onClick={() => setSelectedBranch(branch.id)}
              className={`px-4 py-2 rounded-lg transition-all ${
                selectedBranch === branch.id
                  ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <span className="mr-2">{branch.icon}</span>
              {branch.name}
            </button>
          ))}
        </div>
      </div>

      {/* Balance Display */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-full px-6 py-3">
          <span className="text-2xl mr-2">🪙</span>
          <span className="text-yellow-400 font-bold text-xl">{balance.hamstercoin.toLocaleString()}</span>
          <span className="text-yellow-300 ml-1">Hamster Coins</span>
        </div>
      </div>

      {/* Skill Tree Canvas */}
      <div className="flex justify-center">
        <div className="relative">
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            className="border border-gray-600 rounded-lg cursor-pointer"
            style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' }}
          />
          
          {/* Legend */}
          <div className="absolute top-4 left-4 bg-black/80 rounded-lg p-4 text-sm">
            <div className="flex items-center mb-2">
              <div className="w-4 h-4 bg-green-500 rounded-full mr-2"></div>
              <span className="text-white">Purchased</span>
            </div>
            <div className="flex items-center mb-2">
              <div className="w-4 h-4 bg-yellow-500 rounded-full mr-2"></div>
              <span className="text-white">Unlocked</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-gray-500 rounded-full mr-2"></div>
              <span className="text-white">Locked</span>
            </div>
          </div>
        </div>
      </div>

      {/* Node Details */}
      {currentBranch && (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {currentBranch.nodes.map(node => (
            <div
              key={node.id}
              className={`p-4 rounded-lg border transition-all ${
                node.isPurchased
                  ? 'bg-green-500/10 border-green-500/30'
                  : node.isUnlocked
                  ? 'bg-yellow-500/10 border-yellow-500/30'
                  : 'bg-gray-500/10 border-gray-500/30'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <span className="text-2xl mr-2">{node.icon}</span>
                  <h3 className="text-white font-semibold">{node.name}</h3>
                </div>
                <span className="text-sm text-gray-400">Level {node.level}</span>
              </div>
              
              <p className="text-gray-300 text-sm mb-3">{node.description}</p>
              
              <div className="flex items-center justify-between">
                <span className="text-yellow-400 font-semibold">
                  {node.cost} 🪙
                </span>
                
                {!node.isPurchased && node.isUnlocked && (
                  <button
                    onClick={() => handlePurchase(node.id)}
                    disabled={purchasing === node.id || balance.hamstercoin < node.cost}
                    className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:from-gray-500 disabled:to-gray-600 text-white px-3 py-1 rounded text-sm font-semibold transition-all"
                  >
                    {purchasing === node.id ? 'Purchasing...' : 'Purchase'}
                  </button>
                )}
                
                {node.isPurchased && (
                  <span className="text-green-400 text-sm font-semibold">✓ Purchased</span>
                )}
                
                {!node.isUnlocked && (
                  <span className="text-gray-400 text-sm">🔒 Locked</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Progress Stats */}
      <div className="mt-8 text-center">
        <div className="inline-flex items-center space-x-6 bg-gray-800/50 rounded-lg p-4">
          <div>
            <div className="text-2xl font-bold text-orange-400">{skillTree.purchasedNodes}</div>
            <div className="text-sm text-gray-400">Purchased</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-yellow-400">{skillTree.unlockedNodes}</div>
            <div className="text-sm text-gray-400">Unlocked</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{skillTree.totalNodes}</div>
            <div className="text-sm text-gray-400">Total Nodes</div>
          </div>
        </div>
      </div>
    </div>
  );
}
