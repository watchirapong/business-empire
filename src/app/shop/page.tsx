'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

// Utility function to extract YouTube video ID from URL
const extractYouTubeVideoId = (url: string | undefined): string | null => {
  if (!url) return null;

  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
};

// Utility function to fetch YouTube video title using our API endpoint
const fetchYouTubeVideoTitle = async (videoId: string): Promise<string> => {
  try {
    const response = await fetch(`/api/youtube/title?videoId=${videoId}`);
    if (response.ok) {
      const data = await response.json();
      return data.title || 'YouTube Video';
    }
  } catch (error) {
    console.error('Error fetching YouTube video title:', error);
  }
  return 'YouTube Video';
};

// Comprehensive Shop item interface
interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  inStock: boolean;
  category: string;
  // Content types
  contentType: 'none' | 'text' | 'link' | 'file' | 'youtube';
  textContent?: string;
  linkUrl?: string;
  fileUrl?: string;
  fileName?: string;
  youtubeUrl?: string;
  // Purchase settings
  allowMultiplePurchases?: boolean;
  // Role restrictions
  requiresRole?: boolean;
  requiredRoleId?: string;
  requiredRoleName?: string;
  // File management
  hasFile?: boolean;
  // Analytics
  purchaseCount?: number;
  totalRevenue?: number;
  // Timestamps
  createdAt?: string;
  updatedAt?: string;
}

export default function ShopPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [cart, setCart] = useState<ShopItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCurrency, setSelectedCurrency] = useState<'hamstercoin' | 'stardustcoin'>('hamstercoin');
  const [balance, setBalance] = useState<{hamstercoin: number, stardustcoin: number}>({hamstercoin: 2500, stardustcoin: 1500});
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [youtubeTitles, setYoutubeTitles] = useState<Record<string, string>>({});
  const [showPurchaseSuccess, setShowPurchaseSuccess] = useState(false);
  const [purchasedItem, setPurchasedItem] = useState<any>(null);

  // Fetch shop items
  useEffect(() => {
    const fetchItems = async () => {
      try {
        const response = await fetch('/api/shop/items');
        const data = await response.json();
        if (data.items) {
          setItems(data.items);

          // Fetch YouTube video titles for items with YouTube URLs
          const titles: Record<string, string> = {};
          const titlePromises = data.items
            .filter((item: ShopItem) => item.youtubeUrl && item.youtubeUrl.trim() !== '')
            .map(async (item: ShopItem) => {
              if (item.youtubeUrl) {
                const videoId = extractYouTubeVideoId(item.youtubeUrl);
                if (videoId) {
                  try {
                    const title = await fetchYouTubeVideoTitle(videoId);
                    titles[item.id] = title;
                  } catch (error) {
                    console.error(`Failed to fetch title for video ${videoId}:`, error);
                    titles[item.id] = 'YouTube Video';
                  }
                }
              }
            });

          await Promise.all(titlePromises);
          setYoutubeTitles(titles);
        }
      } catch (error) {
        console.error('Error fetching shop items:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
  }, []);

  // Redirect if not logged in
  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/auth/signin');
    }
  }, [session, status, router]);

  const filteredItems = items.filter(item => {
    // Category filter
    const categoryMatch = selectedCategory === 'all' || item.category === selectedCategory;

    // Search filter
    const searchMatch = !searchQuery ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());

    return categoryMatch && searchMatch;
  });

  const addToCart = async (item: ShopItem) => {
    if (!item.inStock) return;
    if (cart.find(cartItem => cartItem.id === item.id)) {
      alert('Item already in cart!');
      return;
    }

    // Check role requirements before adding to cart
    if (item.requiresRole && item.requiredRoleId) {
      try {
        const response = await fetch(`/api/test-discord-role?roleId=${item.requiredRoleId}`);
        const data = await response.json();

        if (!data.hasRole) {
          const roleName = item.requiredRoleName || item.requiredRoleId;
          alert(`❌ Cannot add to cart!\n\nThis item requires the Discord role: ${roleName}\n\nPlease make sure you have this role in the Discord server before purchasing.`);
          return;
        }
      } catch (error) {
        console.error('Error checking role requirement:', error);
        alert('⚠️ Warning: Unable to verify role requirements. You may not be able to complete the purchase if you don\'t have the required role.');
      }
    }

    setCart([...cart, item]);
  };

  const removeFromCart = (itemId: string) => {
    setCart(cart.filter(item => item.id !== itemId));
  };

  const getTotalPrice = () => {
    return cart.reduce((total, item) => total + item.price, 0);
  };

  const handlePurchase = async () => {
    if (cart.length === 0) {
      alert('Your cart is empty!');
      return;
    }

    const total = getTotalPrice();
    const currentBalance = selectedCurrency === 'hamstercoin' ? balance.hamstercoin : balance.stardustcoin;

    if (currentBalance < total) {
      alert(`Insufficient ${selectedCurrency} balance! You need ${total} coins but only have ${currentBalance}.`);
      return;
    }

    setPurchasing(true);

    try {
      // Process each item in cart
      for (const item of cart) {
        const response = await fetch('/api/shop/purchase', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            itemId: item.id,
            currency: selectedCurrency
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          alert(`Purchase failed: ${data.error}`);
          return;
        }
      }

      // Update balance and clear cart
      setBalance(prev => ({
        ...prev,
        [selectedCurrency]: prev[selectedCurrency] - total
      }));

      // Find the first purchased item for the success modal
      const firstItem = cart[0];
      setPurchasedItem({
        id: firstItem.id,
        name: firstItem.name,
        image: firstItem.image,
        contentType: firstItem.contentType,
        textContent: firstItem.textContent,
        linkUrl: firstItem.linkUrl,
        fileUrl: firstItem.fileUrl,
        hasFile: firstItem.hasFile,
        fileName: firstItem.fileName,
        price: firstItem.price
      });

      setCart([]);
      setShowPurchaseSuccess(true);
    } catch (error) {
      console.error('Purchase error:', error);
      alert('Purchase failed. Please try again.');
    } finally {
      setPurchasing(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black">
      <div className="container mx-auto px-4 py-8 pb-32">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent mb-2">
            🛒 Shop
          </h1>
          <p className="text-gray-300 text-lg">Purchase exclusive items and boosts</p>

          {/* Purchase History Button */}
          <div className="mt-4">
            <button
              onClick={() => router.push('/purchases')}
              className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg transition-colors"
            >
              📦 View Purchase History
            </button>
          </div>

          {/* Balance Display */}
          <div className="mt-4 flex flex-wrap justify-center gap-4">
            {/* HamsterCoin Balance */}
            <div className={`inline-flex items-center border rounded-full px-6 py-3 transition-all ${
              selectedCurrency === 'hamstercoin'
                ? 'bg-gradient-to-r from-yellow-500/30 to-orange-500/30 border-yellow-500/50 ring-2 ring-yellow-500/30'
                : 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/30'
            }`}>
              <span className="text-2xl mr-2">🪙</span>
              <span className="text-yellow-400 font-bold text-xl">{balance.hamstercoin.toLocaleString()}</span>
              <span className="text-yellow-300 ml-1">Hamster Coins</span>
            </div>

            {/* StardustCoin Balance */}
            <div className={`inline-flex items-center border rounded-full px-6 py-3 transition-all ${
              selectedCurrency === 'stardustcoin'
                ? 'bg-gradient-to-r from-purple-500/30 to-pink-500/30 border-purple-500/50 ring-2 ring-purple-500/30'
                : 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-500/30'
            }`}>
              <span className="text-2xl mr-2">✨</span>
              <span className="text-purple-400 font-bold text-xl">{balance.stardustcoin.toLocaleString()}</span>
              <span className="text-purple-300 ml-1">StardustCoin</span>
            </div>
          </div>

          {/* Currency Selector */}
          <div className="mt-4 flex justify-center">
            <div className="bg-white/10 rounded-lg p-2 flex space-x-2">
              <button
                onClick={() => setSelectedCurrency('hamstercoin')}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  selectedCurrency === 'hamstercoin'
                    ? 'bg-yellow-500 text-white'
                    : 'bg-white/10 text-yellow-300 hover:bg-white/20'
                }`}
              >
                🪙 Pay with HamsterCoin
              </button>
              <button
                onClick={() => setSelectedCurrency('stardustcoin')}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  selectedCurrency === 'stardustcoin'
                    ? 'bg-purple-500 text-white'
                    : 'bg-white/10 text-purple-300 hover:bg-white/20'
                }`}
              >
                ✨ Pay with StardustCoin
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mt-6 max-w-md mx-auto">
            <div className="relative">
              <input
                type="text"
                placeholder="🔍 Search items by name or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 pl-12 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all"
              />
              <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                🔍
              </div>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
            {searchQuery && (
              <p className="text-center text-gray-400 text-sm mt-2">
                Found {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''} matching &quot;{searchQuery}&quot;
              </p>
            )}
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex justify-center mb-8">
          <div className="bg-white/10 rounded-lg p-2 flex space-x-2">
            {['all', 'cosmetic', 'gaming'].map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  selectedCategory === category
                    ? 'bg-orange-500 text-white'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                {category === 'all' ? 'All Items' : category.charAt(0).toUpperCase() + category.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Items Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
          {filteredItems.map(item => (
            <div
              key={item.id}
              className={`rounded-xl p-6 transition-all duration-300 relative ${
                item.requiresRole
                  ? 'bg-gradient-to-br from-yellow-900/40 to-amber-800/30 border-2 border-yellow-500/60 hover:border-yellow-400/80 shadow-lg shadow-yellow-500/30'
                  : item.inStock
                  ? 'bg-white/10 border border-white/20 hover:border-white/40'
                  : 'bg-gray-800/50 border border-gray-600/50 opacity-60'
              }`}
            >
              <div className="text-center mb-4">
                {item.requiresRole && (
                  <div className="absolute top-2 right-2 text-2xl animate-bounce">
                    👑
                  </div>
                )}
                <div className="mb-4 relative">
                  {item.image.startsWith('/') ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      className={`w-24 h-24 object-cover rounded-lg mx-auto border ${
                        item.requiresRole
                          ? 'border-yellow-400/60 shadow-lg shadow-yellow-500/40'
                          : 'border-white/20'
                      }`}
                    />
                  ) : (
                    <div className={`text-6xl ${
                      item.requiresRole ? 'drop-shadow-lg drop-shadow-yellow-500/40' : ''
                    }`}>{item.image}</div>
                  )}
                </div>
                <h3 className={`text-xl font-bold mb-2 ${
                  item.requiresRole
                    ? 'text-yellow-200 drop-shadow-lg drop-shadow-yellow-500/50'
                    : 'text-white'
                }`}>{item.name}</h3>
                <p className="text-gray-300 text-sm mb-4">{item.description}</p>

                {/* YouTube Link Display */}
                {item.youtubeUrl && item.youtubeUrl.trim() !== '' && (
                  <div className="mb-4">
                    <a
                      href={item.youtubeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-2 text-red-400 hover:text-red-300 transition-colors text-sm"
                      title={youtubeTitles[item.id] || 'Loading...'}
                    >
                      <span>📺</span>
                      <span className="truncate max-w-48">
                        {youtubeTitles[item.id] || 'Loading YouTube title...'}
                      </span>
                    </a>
                  </div>
                )}

                <div className="text-2xl font-bold text-orange-400 mb-2">${item.price}</div>

                <div className="flex items-center justify-between mb-4">
                  <span className={`text-sm px-2 py-1 rounded-full ${
                    item.inStock
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {item.inStock ? 'In Stock' : 'Out of Stock'}
                  </span>
                  <div className="flex space-x-1">
                    {item.hasFile && (
                      <div className="flex flex-col items-end">
                        <span className="text-sm px-2 py-1 rounded-full bg-blue-500/20 text-blue-400">
                          📁 Has File
                        </span>
                        <span className="text-xs text-gray-400 mt-1">Purchase to download</span>
                      </div>
                    )}
                    {item.requiresRole && (
                      <span
                        className="text-sm px-3 py-1.5 rounded-full bg-gradient-to-r from-yellow-600 to-amber-500 text-white font-semibold shadow-lg border border-yellow-400/50 animate-pulse cursor-help"
                        title={`This item requires the Discord role: ${item.requiredRoleName || item.requiredRoleId || 'Unknown Role'}`}
                      >
                        🔒 {item.requiredRoleName || 'Role Required'}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => addToCart(item)}
                disabled={!item.inStock}
                className="w-full bg-orange-600 hover:bg-orange-500 disabled:bg-gray-500 disabled:cursor-not-allowed text-white py-3 rounded-lg font-semibold transition-colors"
              >
                Add to Cart
              </button>
            </div>
          ))}
        </div>

        {/* Cart Summary */}
        {cart.length > 0 && (
          <div className="fixed bottom-4 right-4 bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 shadow-lg min-w-[300px]">
            <h3 className="text-xl font-bold text-white mb-4">🛒 Cart ({cart.length} items)</h3>

            <div className="space-y-2 mb-4 max-h-40 overflow-y-auto">
              {cart.map(item => (
                <div key={item.id} className="flex items-center justify-between bg-white/5 rounded-lg p-2">
                  <div className="flex items-center space-x-2">
                    <span>{item.image}</span>
                    <span className="text-white text-sm">{item.name}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-orange-400 text-sm">${item.price}</span>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="text-red-400 hover:text-red-300 text-sm"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-white/20 pt-4">
              <div className="flex items-center justify-between mb-4">
                <span className="text-white font-semibold">Total:</span>
                <span className="text-2xl text-orange-400 font-bold">${getTotalPrice()}</span>
              </div>

              <button
                onClick={handlePurchase}
                disabled={purchasing}
                className="w-full bg-green-600 hover:bg-green-500 disabled:bg-gray-500 disabled:cursor-not-allowed text-white py-3 rounded-lg font-semibold transition-colors"
              >
                {purchasing ? 'Processing...' : 'Purchase Now'}
              </button>
            </div>
          </div>
        )}

        {/* Purchase Success Modal */}
        {showPurchaseSuccess && purchasedItem && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-xl p-8 border border-white/20 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="text-center">
                <div className="text-6xl mb-4">🎉</div>
                <h2 className="text-2xl font-bold text-white mb-2">Purchase Successful!</h2>
                <p className="text-gray-300 mb-4">
                  You&apos;ve successfully purchased <span className="text-orange-400 font-semibold">{purchasedItem.name}</span>
                </p>

                {/* Item Image */}
                <div className="mb-4">
                  {purchasedItem.image && purchasedItem.image.startsWith('/') ? (
                    <img
                      src={purchasedItem.image}
                      alt={purchasedItem.name}
                      className="w-20 h-20 object-cover rounded-lg mx-auto border border-white/20"
                    />
                  ) : (
                    <div className="text-4xl mx-auto">{purchasedItem.image || '🛒'}</div>
                  )}
                </div>

                {purchasedItem.contentType === 'link' && purchasedItem.linkUrl && (
                  <div className="bg-blue-500/20 rounded-lg p-4 mb-6 border border-blue-500/30">
                    <div className="text-2xl mb-2">🔗</div>
                    <p className="text-blue-300 font-semibold mb-2">External Link:</p>
                    <a
                      href={purchasedItem.linkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 text-sm break-all bg-white/10 rounded p-2 block"
                    >
                      {purchasedItem.linkUrl}
                    </a>
                    <p className="text-gray-400 text-xs mt-2">Click to open in new tab</p>
                  </div>
                )}

                {purchasedItem.contentType === 'file' && purchasedItem.hasFile && (
                  <div className="bg-purple-500/20 rounded-lg p-4 mb-6 border border-purple-500/30">
                    <div className="text-2xl mb-2">📁</div>
                    <p className="text-purple-300 font-semibold mb-1">File Available for Download</p>
                    {purchasedItem.fileName && (
                      <p className="text-gray-300 text-sm">{purchasedItem.fileName}</p>
                    )}
                  </div>
                )}

                {purchasedItem.contentType === 'text' && purchasedItem.textContent && (
                  <div className="bg-green-500/20 rounded-lg p-4 mb-6 border border-green-500/30">
                    <div className="text-2xl mb-2">📝</div>
                    <p className="text-green-300 font-semibold mb-2">Text Content:</p>
                    <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-600/30">
                      <p className="text-white text-sm whitespace-pre-wrap">{purchasedItem.textContent}</p>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex space-x-3 mb-4">
                  {purchasedItem.contentType === 'file' && purchasedItem.hasFile && (
                    <button
                      onClick={async () => {
                        try {
                          const response = await fetch(`/api/shop/download?itemId=${purchasedItem.id}`);
                          if (response.ok) {
                            const blob = await response.blob();
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;

                            // Get filename from Content-Disposition header or use default
                            const contentDisposition = response.headers.get('content-disposition');
                            let filename = purchasedItem.fileName || 'download';
                            if (contentDisposition) {
                              const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
                              if (filenameMatch) {
                                filename = filenameMatch[1];
                              }
                            }

                            a.download = filename;
                            document.body.appendChild(a);
                            a.click();
                            window.URL.revokeObjectURL(url);
                            document.body.removeChild(a);

                            alert('Download completed successfully!');
                          } else {
                            alert('Download failed. Please try again.');
                          }
                        } catch (error) {
                          console.error('Download error:', error);
                          alert('Download failed. Please try again.');
                        }
                      }}
                      className="flex-1 bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                    >
                      📥 Download Now
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setShowPurchaseSuccess(false);
                      setPurchasedItem(null);
                    }}
                    className="flex-1 bg-gray-600 hover:bg-gray-500 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                  >
                    Close
                  </button>
                </div>

                <p className="text-gray-400 text-sm">
                  You can access this content anytime from your <span className="text-blue-400 cursor-pointer" onClick={() => router.push('/purchases')}>Purchase History</span>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
