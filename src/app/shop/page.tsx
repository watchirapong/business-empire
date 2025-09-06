'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

// Shop item interface
interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  inStock: boolean;
  category: string;
}

export default function ShopPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [cart, setCart] = useState<ShopItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [balance, setBalance] = useState<number>(2500);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  // Fetch shop items
  useEffect(() => {
    const fetchItems = async () => {
      try {
        const response = await fetch('/api/shop/items');
        const data = await response.json();
        if (data.items) {
          setItems(data.items);
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

  const filteredItems = selectedCategory === 'all'
    ? items
    : items.filter(item => item.category === selectedCategory);

  const addToCart = (item: ShopItem) => {
    if (!item.inStock) return;
    if (cart.find(cartItem => cartItem.id === item.id)) {
      alert('Item already in cart!');
      return;
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
    if (balance < total) {
      alert(`Insufficient balance! You need ${total} coins but only have ${balance}.`);
      return;
    }

    setPurchasing(true);

    try {
      // Process each item in cart
      for (const item of cart) {
        const response = await fetch('/api/shop/items', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            itemId: item.id,
            userId: (session?.user as any)?.id
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          alert(`Purchase failed: ${data.error}`);
          return;
        }
      }

      // Update balance and clear cart
      setBalance(balance - total);
      setCart([]);
      alert(`Purchase successful! Spent ${total} coins.`);
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
          <div className="mt-4 inline-flex items-center border rounded-full px-6 py-3 bg-gradient-to-r from-yellow-500/30 to-orange-500/30 border-yellow-500/50">
            <span className="text-2xl mr-2">🪙</span>
            <span className="text-yellow-400 font-bold text-xl">{balance.toLocaleString()}</span>
            <span className="text-yellow-300 ml-1">Coins</span>
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
              className={`rounded-xl p-6 transition-all duration-300 ${
                item.inStock
                  ? 'bg-white/10 border border-white/20 hover:border-white/40'
                  : 'bg-gray-800/50 border border-gray-600/50 opacity-60'
              }`}
            >
              <div className="text-center mb-4">
                <div className="text-6xl mb-4">{item.image}</div>
                <h3 className="text-xl font-bold text-white mb-2">{item.name}</h3>
                <p className="text-gray-300 text-sm mb-4">{item.description}</p>
                <div className="text-2xl font-bold text-orange-400 mb-4">${item.price}</div>

                <span className={`text-sm px-2 py-1 rounded-full ${
                  item.inStock
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  {item.inStock ? 'In Stock' : 'Out of Stock'}
                </span>
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
      </div>
    </div>
  );
}
