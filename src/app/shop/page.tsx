'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { isAdmin } from '@/lib/admin-config';

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
  const [isShopAdmin, setIsShopAdmin] = useState(false);
  const [editingShopItem, setEditingShopItem] = useState<any>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editFormData, setEditFormData] = useState<any>({});

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

  // Redirect if not logged in and check admin status
  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    // Check if user is admin
    const userId = (session.user as any).id;
    setIsShopAdmin(isAdmin(userId));
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

          {/* Admin and Purchase History Buttons */}
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <button
              onClick={() => router.push('/purchases')}
              className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg transition-colors"
            >
              📦 View Purchase History
            </button>

            {isShopAdmin && (
              <button
                onClick={() => {
                  setEditingShopItem(null);
                  setEditFormData({
                    name: '',
                    description: '',
                    price: 0,
                    category: '',
                    image: '',
                    inStock: true,
                    allowMultiplePurchases: false,
                    contentType: 'none',
                    textContent: '',
                    linkUrl: '',
                    youtubeUrl: '',
                    fileUrl: '',
                    fileName: '',
                    hasFile: false,
                    requiresRole: false,
                    requiredRoleId: '',
                    requiredRoleName: ''
                  });
                  setShowEditForm(true);
                }}
                className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-lg transition-colors"
              >
                ➕ Post New Item
              </button>
            )}
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

                {/* YouTube Video Preview */}
                {item.youtubeUrl && item.youtubeUrl.trim() !== '' && (
                  <div className="mb-4">
                    <div className="relative group">
                      <a
                        href={item.youtubeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block relative overflow-hidden rounded-lg border border-red-500/30 hover:border-red-400/50 transition-all duration-300"
                        title={`Watch: ${youtubeTitles[item.id] || 'YouTube Video'}`}
                      >
                        {/* YouTube Thumbnail */}
                        <div className="relative bg-gradient-to-br from-red-500/20 to-red-600/20 p-3">
                          <div className="aspect-video bg-gray-800 rounded flex items-center justify-center relative overflow-hidden">
                            {/* YouTube Play Button Overlay */}
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
                              <div className="bg-red-600 rounded-full p-3 shadow-lg">
                                <svg className="w-6 h-6 text-white ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M8 5v10l8-5-8-5z"/>
                                </svg>
                              </div>
                            </div>

                            {/* Video Title Overlay */}
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                              <p className="text-white text-sm font-semibold truncate">
                                {youtubeTitles[item.id] || 'Loading YouTube title...'}
                              </p>
                              <p className="text-red-300 text-xs flex items-center">
                                <span className="mr-1">🎬</span>
                                Click to watch
                              </p>
                            </div>

                            {/* Fallback for when thumbnail doesn't load */}
                            <div className="text-red-400 text-4xl opacity-50">
                              📺
                            </div>
                          </div>
                        </div>

                        {/* Hover Effect */}
                        <div className="absolute inset-0 bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg"></div>
                      </a>
                    </div>
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

              <div className="flex space-x-2">
                <button
                  onClick={() => addToCart(item)}
                  disabled={!item.inStock}
                  className="flex-1 bg-orange-600 hover:bg-orange-500 disabled:bg-gray-500 disabled:cursor-not-allowed text-white py-3 rounded-lg font-semibold transition-colors"
                >
                  Add to Cart
                </button>

                {isShopAdmin && (
                  <button
                    onClick={() => {
                      setEditingShopItem(item);
                      setEditFormData({...item});
                      setShowEditForm(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-3 rounded-lg font-semibold transition-colors"
                    title="Edit Item (Admin)"
                  >
                    ✏️
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Edit Item Modal */}
        {showEditForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  {editingShopItem ? 'Edit Shop Item' : 'Post New Item'}
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input
                      type="text"
                      value={editFormData.name || ''}
                      onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={editFormData.description || ''}
                      onChange={(e) => setEditFormData({...editFormData, description: e.target.value})}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900 bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
                      <input
                        type="number"
                        value={editFormData.price || ''}
                        onChange={(e) => setEditFormData({...editFormData, price: parseFloat(e.target.value) || 0})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                      <select
                        value={editFormData.category || ''}
                        onChange={(e) => setEditFormData({...editFormData, category: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900 bg-white"
                      >
                        <option value="">Select Category</option>
                        <option value="weapons">Weapons</option>
                        <option value="armor">Armor</option>
                        <option value="consumables">Consumables</option>
                        <option value="cosmetics">Cosmetics</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                    <input
                      type="text"
                      value={editFormData.image || ''}
                      onChange={(e) => setEditFormData({...editFormData, image: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Content Type</label>
                    <select
                      value={editFormData.contentType || 'none'}
                      onChange={(e) => setEditFormData({...editFormData, contentType: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900 bg-white"
                    >
                      <option value="none">No Content (Digital Item)</option>
                      <option value="text">Text Content</option>
                      <option value="link">External Link</option>
                      <option value="file">Downloadable File</option>
                      <option value="youtube">YouTube Video</option>
                    </select>
                  </div>

                  {/* Text Content Field */}
                  {editFormData.contentType === 'text' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Text Content</label>
                      <textarea
                        value={editFormData.textContent || ''}
                        onChange={(e) => setEditFormData({...editFormData, textContent: e.target.value})}
                        rows={5}
                        placeholder="Enter the text content that will be shown to buyers after purchase..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono text-gray-900 bg-white"
                      />
                      <p className="text-xs text-gray-500 mt-1">This text will be displayed to users after they purchase this item.</p>
                    </div>
                  )}

                  {/* Link Content Field */}
                  {editFormData.contentType === 'link' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">External Link URL</label>
                      <input
                        type="url"
                        value={editFormData.linkUrl || ''}
                        onChange={(e) => setEditFormData({...editFormData, linkUrl: e.target.value})}
                        placeholder="https://example.com/your-link"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900 bg-white"
                      />
                      <p className="text-xs text-gray-500 mt-1">Users will be able to access this link after purchasing the item.</p>
                    </div>
                  )}

                  {/* File Content Fields */}
                  {editFormData.contentType === 'file' && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">File URL</label>
                        <input
                          type="text"
                          value={editFormData.fileUrl || ''}
                          onChange={(e) => setEditFormData({...editFormData, fileUrl: e.target.value})}
                          placeholder="/uploads/files/your-file.zip"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">File Name (for download)</label>
                        <input
                          type="text"
                          value={editFormData.fileName || ''}
                          onChange={(e) => setEditFormData({...editFormData, fileName: e.target.value})}
                          placeholder="my-file.zip"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900 bg-white"
                        />
                      </div>
                    </div>
                  )}

                  {/* YouTube Video Preview Field (Optional for all item types) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">YouTube Video Preview (Optional)</label>
                      <input
                        type="url"
                        value={editFormData.youtubeUrl || ''}
                        onChange={(e) => setEditFormData({...editFormData, youtubeUrl: e.target.value})}
                        placeholder="https://www.youtube.com/watch?v=VIDEO_ID"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900 bg-white"
                      />
                    <p className="text-xs text-gray-500 mt-1">Optional: Add a YouTube video that will show as a preview in the shop item card.</p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="inStock"
                      checked={editFormData.inStock || false}
                      onChange={(e) => setEditFormData({...editFormData, inStock: e.target.checked})}
                      className="rounded"
                    />
                    <label htmlFor="inStock" className="text-sm font-medium text-gray-700">In Stock</label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="allowMultiple"
                      checked={editFormData.allowMultiplePurchases || false}
                      onChange={(e) => setEditFormData({...editFormData, allowMultiplePurchases: e.target.checked})}
                      className="rounded"
                    />
                    <label htmlFor="allowMultiple" className="text-sm font-medium text-gray-700">Allow Multiple Purchases</label>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => {
                      setShowEditForm(false);
                      setEditingShopItem(null);
                      setEditFormData({});
                    }}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        const isEditing = editingShopItem !== null;
                        const method = isEditing ? 'PUT' : 'POST';
                        const successMessage = isEditing ? 'Item updated successfully!' : 'Item created successfully!';

                        // Prepare form data with proper hasFile flag
                        const formDataToSubmit = {
                          ...editFormData,
                          hasFile: editFormData.contentType === 'file'
                        };

                        const response = await fetch('/api/shop/items', {
                          method: method,
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify(formDataToSubmit),
                        });

                        if (response.ok) {
                          // Refresh items
                          const itemsResponse = await fetch('/api/shop/items');
                          const data = await itemsResponse.json();
                          setItems(data);

                          setShowEditForm(false);
                          setEditingShopItem(null);
                          setEditFormData({});
                          alert(successMessage);
                        } else {
                          const errorData = await response.json();
                          alert(`Failed to ${isEditing ? 'update' : 'create'} item: ${errorData.error || 'Unknown error'}`);
                        }
                      } catch (error) {
                        console.error(`Error ${editingShopItem ? 'updating' : 'creating'} item:`, error);
                        alert(`Error ${editingShopItem ? 'updating' : 'creating'} item`);
                      }
                    }}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                  >
                    {editingShopItem ? 'Update Item' : 'Create Item'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

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
                <div className="mb-6">
                  {purchasedItem.image && purchasedItem.image.startsWith('/') ? (
                    <img
                      src={purchasedItem.image}
                      alt={purchasedItem.name}
                      className="w-24 h-24 object-cover rounded-lg mx-auto border border-white/20 shadow-lg"
                    />
                  ) : (
                    <div className="text-5xl mx-auto">{purchasedItem.image || '🛒'}</div>
                  )}
                </div>

                {/* Content Display Based on Type */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-white mb-4">🎁 Your Purchased Content:</h3>

                  {/* Text Content */}
                  {purchasedItem.contentType === 'text' && purchasedItem.textContent && (
                    <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl p-5 mb-4 border border-green-500/30 shadow-lg">
                      <div className="flex items-center mb-3">
                        <div className="text-3xl mr-3">📝</div>
                        <div>
                          <h4 className="text-green-300 font-bold text-lg">Text Content</h4>
                          <p className="text-green-200 text-sm">Your exclusive text content</p>
                        </div>
                      </div>
                      <div className="bg-gray-900/70 rounded-lg p-4 border border-gray-600/50">
                        <div className="text-white text-base leading-relaxed whitespace-pre-wrap font-mono">
                          {purchasedItem.textContent}
                        </div>
                      </div>
                      <div className="mt-3 flex items-center text-green-300 text-sm">
                        <span className="mr-2">✅</span>
                        <span>Content unlocked and available</span>
                      </div>
                    </div>
                  )}

                  {/* Link Content */}
                  {purchasedItem.contentType === 'link' && purchasedItem.linkUrl && (
                    <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl p-5 mb-4 border border-blue-500/30 shadow-lg">
                      <div className="flex items-center mb-3">
                        <div className="text-3xl mr-3">🔗</div>
                        <div>
                          <h4 className="text-blue-300 font-bold text-lg">External Link</h4>
                          <p className="text-blue-200 text-sm">Access your exclusive link</p>
                        </div>
                      </div>
                      <div className="bg-gray-900/70 rounded-lg p-4 border border-gray-600/50">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 mr-4">
                            <p className="text-blue-300 font-semibold mb-1">Your Exclusive Link:</p>
                            <p className="text-blue-400 text-sm break-all font-mono bg-blue-900/30 rounded p-2">
                              {purchasedItem.linkUrl}
                            </p>
                          </div>
                          <a
                            href={purchasedItem.linkUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-semibold transition-colors shadow-md hover:shadow-lg"
                          >
                            🌐 Open Link
                          </a>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center text-blue-300 text-sm">
                        <span className="mr-2">🔓</span>
                        <span>Link unlocked - opens in new tab</span>
                      </div>
                    </div>
                  )}

                  {/* File Content */}
                  {purchasedItem.contentType === 'file' && purchasedItem.hasFile && (
                    <div className="bg-gradient-to-br from-purple-500/20 to-violet-500/20 rounded-xl p-5 mb-4 border border-purple-500/30 shadow-lg">
                      <div className="flex items-center mb-3">
                        <div className="text-3xl mr-3">📁</div>
                        <div>
                          <h4 className="text-purple-300 font-bold text-lg">Downloadable File</h4>
                          <p className="text-purple-200 text-sm">Download your purchased file</p>
                        </div>
                      </div>
                      <div className="bg-gray-900/70 rounded-lg p-4 border border-gray-600/50">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 mr-4">
                            <p className="text-purple-300 font-semibold mb-1">File Details:</p>
                            <p className="text-purple-400 text-sm">
                              {purchasedItem.fileName || 'Download file'}
                            </p>
                          </div>
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

                                  alert('✅ Download completed successfully!');
                                } else {
                                  alert('❌ Download failed. Please try again.');
                                }
                              } catch (error) {
                                console.error('Download error:', error);
                                alert('❌ Download failed. Please try again.');
                              }
                            }}
                            className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg font-semibold transition-colors shadow-md hover:shadow-lg"
                          >
                            📥 Download
                          </button>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center text-purple-300 text-sm">
                        <span className="mr-2">📋</span>
                        <span>File ready for download</span>
                      </div>
                    </div>
                  )}

                  {/* YouTube Video Preview */}
                  {purchasedItem.youtubeUrl && purchasedItem.youtubeUrl.trim() !== '' && (
                    <div className="bg-gradient-to-br from-red-500/20 to-pink-500/20 rounded-xl p-5 mb-4 border border-red-500/30 shadow-lg">
                      <div className="flex items-center mb-3">
                        <div className="text-3xl mr-3">🎥</div>
                        <div>
                          <h4 className="text-red-300 font-bold text-lg">YouTube Video Preview</h4>
                          <p className="text-red-200 text-sm">Watch the video preview for this item</p>
                        </div>
                      </div>
                      <div className="bg-gray-900/70 rounded-lg p-4 border border-gray-600/50">
                        <div className="relative">
                          <div className="aspect-video bg-gray-800 rounded flex items-center justify-center relative overflow-hidden mb-3">
                            {/* YouTube Play Button Overlay */}
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
                              <div className="bg-red-600 rounded-full p-4 shadow-lg">
                                <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M8 5v10l8-5-8-5z"/>
                                </svg>
                              </div>
                            </div>

                            {/* Video Title */}
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                              <p className="text-white text-sm font-semibold">
                                {youtubeTitles[purchasedItem.id] || 'YouTube Video Preview'}
                              </p>
                            </div>

                            {/* Fallback */}
                            <div className="text-red-400 text-4xl opacity-50">
                              📺
                            </div>
                          </div>

                          <a
                            href={purchasedItem.youtubeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-red-600 hover:bg-red-500 text-white px-6 py-3 rounded-lg font-semibold transition-colors shadow-md hover:shadow-lg inline-block text-center w-full"
                          >
                            🎬 Watch Video on YouTube
                          </a>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center text-red-300 text-sm">
                        <span className="mr-2">▶️</span>
                        <span>Video preview available - opens in new tab</span>
                      </div>
                    </div>
                  )}

                  {/* No Content */}
                  {(!purchasedItem.contentType || purchasedItem.contentType === 'none') && (
                    <div className="bg-gradient-to-br from-gray-500/20 to-slate-500/20 rounded-xl p-5 mb-4 border border-gray-500/30 shadow-lg">
                      <div className="flex items-center mb-3">
                        <div className="text-3xl mr-3">🎁</div>
                        <div>
                          <h4 className="text-gray-300 font-bold text-lg">Digital Item</h4>
                          <p className="text-gray-200 text-sm">You now own this exclusive item</p>
                        </div>
                      </div>
                      <div className="bg-gray-900/70 rounded-lg p-4 border border-gray-600/50">
                        <p className="text-white text-center">
                          ✨ <strong>{purchasedItem.name}</strong> is now in your collection!
                        </p>
                      </div>
                      <div className="mt-3 flex items-center text-gray-300 text-sm">
                        <span className="mr-2">🏆</span>
                        <span>Item unlocked and added to your inventory</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex justify-center">
                  <button
                    onClick={() => {
                      setShowPurchaseSuccess(false);
                      setPurchasedItem(null);
                    }}
                    className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white px-8 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    🛒 Continue Shopping
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
