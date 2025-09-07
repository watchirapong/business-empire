'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useBehaviorTracking } from '@/hooks/useBehaviorTracking';

interface GachaItem {
  id: string;
  name: string;
  description: string;
  image: string;
  rarity: string;
  dropRate: number;
  isActive: boolean;
}

const rarityColors = {
  common: '#6B7280',
  rare: '#3B82F6',
  epic: '#8B5CF6',
  legendary: '#F59E0B',
  mythic: '#EF4444'
};

const rarityNames = {
  common: 'Common',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
  mythic: 'Mythic'
};

export default function GachaPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const wheelRef = useRef<HTMLDivElement>(null);
  
  // Track gacha visits
  const { trackBehavior } = useBehaviorTracking({
    behaviorType: 'gacha_play',
    section: 'gacha',
    action: 'view_gacha'
  });
  const [gachaItems, setGachaItems] = useState<GachaItem[]>([]);
  const [userBalance, setUserBalance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [lastPulledItem, setLastPulledItem] = useState<GachaItem | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [loading, setLoading] = useState(true);
  const [wheelRotation, setWheelRotation] = useState(0);

  useEffect(() => {
    if (!session) {
      router.push('/auth/signin');
      return;
    }
    fetchGachaItems();
    fetchUserBalance();
  }, [session, router]);

  const fetchGachaItems = async () => {
    try {
      const response = await fetch('/api/gacha/items');
      if (response.ok) {
        const data = await response.json();
        setGachaItems(data.items || []);
      } else {
        console.error('Failed to fetch gacha items:', response.status);
        setGachaItems([]);
      }
    } catch (error) {
      console.error('Error fetching gacha items:', error);
      setGachaItems([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserBalance = async () => {
    try {
      const response = await fetch('/api/currency/balance');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.balance) {
          // Use hamstercoin balance for gacha pulls
          setUserBalance(data.balance.hamstercoin || 0);
        }
      } else {
        console.error('Failed to fetch balance:', response.status);
        setUserBalance(0);
      }
    } catch (error) {
      console.error('Error fetching user balance:', error);
      setUserBalance(0);
    }
  };

  const handleGachaPull = async () => {
    // Comprehensive validation
    if (!session?.user) {
      alert('You must be logged in to pull from gacha!');
      return;
    }

    if (userBalance < 10) {
      alert('You need at least 10 Hamster Shop coins to pull!');
      return;
    }

    if (gachaItems.length === 0) {
      alert('No gacha items available! Please contact an admin to add items.');
      return;
    }

    if (isPulling) {
      console.warn('Gacha pull already in progress');
      return;
    }

    setIsPulling(true);

    try {
      const response = await fetch('/api/gacha/pull', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        
        // Calculate the correct final position for the winning item
        const winningItem = data.item;

        if (wheelSegments.length === 0) {
          console.error('No wheel segments available for gacha animation');
          // Fallback: just show the result without animation
          setLastPulledItem(winningItem);
          setShowResult(true);
          setUserBalance(data.newBalance);
          setIsPulling(false);
          return;
        }

        const winningSegment = wheelSegments.find(segment => segment.id === winningItem.id);

        if (winningSegment) {
          // Calculate the center angle of the winning segment
          const segmentCenterAngle = (winningSegment.startAngle + winningSegment.endAngle) / 2;

          // The arrow points to the top (270 degrees), so we need to rotate the wheel
          // so that the winning segment center is at the top
          const targetAngle = 270 - segmentCenterAngle;

          // Add multiple rotations plus the target angle
          const baseRotations = 8 + Math.random() * 4; // 8-12 full rotations
          const spinRotation = wheelRotation + (baseRotations * 360) + targetAngle;

          // Start the spinning animation
          setWheelRotation(spinRotation);
        } else {
          console.warn('Winning item not found in wheel segments, using fallback');
          // Fallback: just show the result without animation
          setLastPulledItem(winningItem);
          setShowResult(true);
          setUserBalance(data.newBalance);
          setIsPulling(false);
        }
        
        // Track gacha spending
        trackBehavior({
          behaviorType: 'gacha_spend',
          section: 'gacha',
          action: 'pull_gacha',
          details: {
            coinsSpent: 10,
            itemWon: {
              id: data.item.id,
              name: data.item.name,
              rarity: data.item.rarity
            },
            newBalance: data.newBalance
          }
        });

        // Wait for wheel animation to complete (4.5 seconds)
        setTimeout(() => {
        setLastPulledItem(data.item);
        setUserBalance(data.newBalance);
        setShowResult(true);
          setIsPulling(false);
        
        // Hide result after 5 seconds
        setTimeout(() => {
          setShowResult(false);
          setLastPulledItem(null);
        }, 5000);
        }, 4500);
      } else {
        const errorData = await response.json();
        setIsPulling(false);
        if (errorData.error === 'Insufficient Hamster Coins') {
          alert(`Insufficient Hamster Shop coins! You have ${errorData.currentBalance} coins but need ${errorData.requiredAmount} coins.`);
        } else {
          alert(errorData.error || 'Gacha pull failed');
        }
      }
    } catch (error) {
      console.error('Error during gacha pull:', error);
      setIsPulling(false);
      alert('Error during gacha pull');
    }
  };

  // Create wheel segments based on gacha items
  const wheelSegments = useMemo(() => {
    if (gachaItems.length === 0) return [];

    const segments: Array<GachaItem & { startAngle: number; endAngle: number; color: string }> = [];
    let currentAngle = 0;
    const totalDropRate = gachaItems.reduce((sum, item) => sum + item.dropRate, 0);

    gachaItems.forEach((item) => {
      const segmentAngle = (item.dropRate / totalDropRate) * 360;
      segments.push({
        ...item,
        startAngle: currentAngle,
        endAngle: currentAngle + segmentAngle,
        color: rarityColors[item.rarity as keyof typeof rarityColors] || '#6B7280'
      });
      currentAngle += segmentAngle;
    });

    return segments;
  }, [gachaItems]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
        <div className="text-white text-xl">Loading gacha system...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent mb-2">
            🎰 Wheel Gacha
          </h1>
          <p className="text-gray-300 text-lg">Spin the wheel for rare items with your Hamster Shop coins!</p>
          
          {/* User Balance */}
          <div className="mt-4 bg-white/10 rounded-xl p-4 inline-block">
            <div className="text-2xl font-bold text-orange-400">
              {userBalance} 🪙
            </div>
            <div className="text-gray-400 text-sm">Your Balance</div>
          </div>
        </div>

        {/* Back Button */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-lg transition-colors"
          >
            ← Back
          </button>
        </div>

        {gachaItems.length === 0 ? (
          /* No Items Available */
          <div className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-purple-500/20 p-12 text-center">
            <div className="text-8xl mb-6">🎰</div>
            <h2 className="text-3xl font-bold text-white mb-4">No Items Available</h2>
            <p className="text-gray-400 text-lg mb-6">
              The gacha wheel is empty! Please contact an admin to add items to the gacha system.
            </p>
            <div className="text-sm text-gray-500">
              Admins can add items through the Admin Panel → Gacha Management
            </div>
          </div>
        ) : (
          <>
            {/* Wheel Section */}
            <div className="flex justify-center items-center mb-8">
              {/* Spinning Wheel */}
              <div className="relative">
                {/* Wheel Container */}
                <div className="relative w-[28rem] h-[28rem] mx-auto">
                  {/* Enhanced Pointer */}
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1 z-30">
                    <div className="w-0 h-0 border-l-12 border-r-12 border-b-24 border-l-transparent border-r-transparent border-b-red-500 drop-shadow-2xl animate-pulse"></div>
                    <div className="w-0 h-0 border-l-8 border-r-8 border-b-16 border-l-transparent border-r-transparent border-b-yellow-400 drop-shadow-lg -mt-1"></div>
                  </div>
                  
                  {/* Wheel */}
                  <div 
                    ref={wheelRef}
                    className={`w-[28rem] h-[28rem] rounded-full border-8 border-yellow-400 relative overflow-hidden shadow-2xl ${
                      isPulling ? 'animate-pulse' : ''
                    }`}
                    style={{
                      transform: `rotate(${wheelRotation}deg)`,
                      transition: isPulling ? 'transform 4.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)' : 'none',
                      filter: isPulling ? 'drop-shadow(0 0 20px rgba(255, 215, 0, 0.6))' : 'none'
                    }}
                  >
                    {/* Wheel Segments */}
                    <svg className="w-full h-full" viewBox="0 0 280 280">
                      {wheelSegments.map((segment) => {
                        const centerX = 140;
                        const centerY = 140;
                        const radius = 130;
                        const startAngle = (segment.startAngle - 90) * (Math.PI / 180);
                        const endAngle = (segment.endAngle - 90) * (Math.PI / 180);
                        
                        const x1 = centerX + radius * Math.cos(startAngle);
                        const y1 = centerY + radius * Math.sin(startAngle);
                        const x2 = centerX + radius * Math.cos(endAngle);
                        const y2 = centerY + radius * Math.sin(endAngle);
                        
                        const largeArcFlag = segment.endAngle - segment.startAngle > 180 ? 1 : 0;
                        
                        const pathData = [
                          `M ${centerX} ${centerY}`,
                          `L ${x1} ${y1}`,
                          `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                          'Z'
                        ].join(' ');
                        
                        const textAngle = (segment.startAngle + segment.endAngle) / 2;
                        const textRadius = radius * 0.7;
                        const textX = centerX + textRadius * Math.cos((textAngle - 90) * (Math.PI / 180));
                        const textY = centerY + textRadius * Math.sin((textAngle - 90) * (Math.PI / 180));
                        
                        return (
                          <g key={segment.id}>
                            <path
                              d={pathData}
                              fill={segment.color}
                              stroke="#ffffff"
                              strokeWidth="1"
                              opacity="0.9"
                            />
                            {/* Show emoji or image */}
                            {segment.image.startsWith('/') ? (
                              <image
                                x={textX - 20}
                                y={textY - 20}
                                width="40"
                                height="40"
                                href={segment.image}
                                transform={`rotate(${textAngle}, ${textX}, ${textY})`}
                              />
                            ) : (
                              <text
                                x={textX}
                                y={textY}
                                fill="white"
                                fontSize="24"
                                fontWeight="bold"
                                textAnchor="middle"
                                dominantBaseline="middle"
                                transform={`rotate(${textAngle}, ${textX}, ${textY})`}
                              >
                                {segment.image}
                              </text>
                            )}
                            
                            {/* Show drop rate */}
                            <text
                              x={textX}
                              y={textY + 25}
                              fill="white"
                              fontSize="12"
                              fontWeight="bold"
                              textAnchor="middle"
                              dominantBaseline="middle"
                              transform={`rotate(${textAngle}, ${textX}, ${textY})`}
                              style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}
                            >
                              {segment.dropRate.toFixed(1)}%
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                  
                  {/* Center Circle with Spin Button - Fixed Position */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-yellow-400 rounded-full border-4 border-white shadow-lg flex items-center justify-center z-20">
            <button
              onClick={handleGachaPull}
              disabled={isPulling || userBalance < 10}
                      className={`w-full h-full rounded-full flex flex-col items-center justify-center transition-all transform hover:scale-105 ${
                        isPulling
                          ? 'bg-gradient-to-r from-yellow-500 to-orange-500 cursor-not-allowed animate-pulse'
                          : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
                      } text-white shadow-lg`}
                    >
                      <div className="text-2xl mb-1">🎰</div>
                      <div className="text-xs font-bold">
                        {isPulling ? 'SPINNING...' : 'SPIN NOW!'}
                      </div>
            </button>
          </div>
        </div>
              </div>
            </div>
          </>
        )}

        {/* Result Modal */}
        {showResult && lastPulledItem && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-gradient-to-br from-purple-900/90 to-pink-900/90 backdrop-blur-sm rounded-2xl border border-purple-500/30 p-8 max-w-md mx-4 text-center animate-pulse">
              <h3 className="text-3xl font-bold text-white mb-4">🎉 Congratulations!</h3>
              
              <div className="mb-6">
                {lastPulledItem.image.startsWith('/') ? (
                  <img 
                    src={lastPulledItem.image} 
                    alt={lastPulledItem.name}
                    className="w-32 h-32 object-cover rounded-xl mx-auto mb-4 border-4 border-purple-500/50"
                  />
                ) : (
                  <div className="text-8xl mx-auto mb-4">{lastPulledItem.image}</div>
                )}
                <h4 className="text-2xl font-bold text-white mb-2">{lastPulledItem.name}</h4>
                <p className="text-gray-300 text-sm mb-4">{lastPulledItem.description}</p>
                
                <div 
                  className="inline-block px-4 py-2 rounded-full text-sm font-semibold text-white"
                  style={{ backgroundColor: rarityColors[lastPulledItem.rarity as keyof typeof rarityColors] }}
                >
                  {rarityNames[lastPulledItem.rarity as keyof typeof rarityNames]} - {lastPulledItem.dropRate}%
                </div>
              </div>
              
              <button
                onClick={() => setShowResult(false)}
                className="bg-purple-600 hover:bg-purple-500 text-white px-8 py-3 rounded-lg transition-colors font-bold"
              >
                Awesome!
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
