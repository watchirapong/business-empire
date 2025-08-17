'use client';

import React, { useState } from 'react';

interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  inStock: boolean;
}

const HamsterShop: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [cart, setCart] = useState<ShopItem[]>([]);

  const shopItems: ShopItem[] = [
    {
      id: '1',
      name: 'Premium Hamster Food',
      description: 'High-quality nutrition for your beloved hamster',
      price: 15.99,
      category: 'food',
      image: '🥜',
      inStock: true
    },
    {
      id: '2',
      name: 'Luxury Hamster Cage',
      description: 'Spacious and comfortable living space',
      price: 89.99,
      category: 'housing',
      image: '🏠',
      inStock: true
    },
    {
      id: '3',
      name: 'Exercise Wheel',
      description: 'Keep your hamster active and healthy',
      price: 24.99,
      category: 'toys',
      image: '🎡',
      inStock: true
    },
    {
      id: '4',
      name: 'Hamster Bedding',
      description: 'Soft and absorbent bedding material',
      price: 12.99,
      category: 'accessories',
      image: '🛏️',
      inStock: true
    },
    {
      id: '5',
      name: 'Treats Variety Pack',
      description: 'Delicious treats for special occasions',
      price: 8.99,
      category: 'food',
      image: '🍎',
      inStock: true
    },
    {
      id: '6',
      name: 'Tunnel System',
      description: 'Fun tunnels for exploration and play',
      price: 19.99,
      category: 'toys',
      image: '🕳️',
      inStock: false
    }
  ];

  const categories = [
    { id: 'all', name: 'All Items' },
    { id: 'food', name: 'Food & Treats' },
    { id: 'housing', name: 'Housing' },
    { id: 'toys', name: 'Toys & Entertainment' },
    { id: 'accessories', name: 'Accessories' }
  ];

  const filteredItems = selectedCategory === 'all' 
    ? shopItems 
    : shopItems.filter(item => item.category === selectedCategory);

  const addToCart = (item: ShopItem) => {
    setCart([...cart, item]);
  };

  const removeFromCart = (itemId: string) => {
    setCart(cart.filter(item => item.id !== itemId));
  };

  const getTotalPrice = () => {
    return cart.reduce((total, item) => total + item.price, 0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent mb-2">🐹 Hamster Shop</h1>
          <p className="text-gray-300 text-lg">Everything your hamster needs for a happy life!</p>
        </div>

        {/* Cart Summary */}
        {cart.length > 0 && (
          <div className="bg-white/10 rounded-xl p-4 mb-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div className="text-white">
                <span className="font-semibold">Cart ({cart.length} items)</span>
                <span className="ml-4 text-orange-400 font-bold">${getTotalPrice().toFixed(2)}</span>
              </div>
              <button 
                onClick={() => setCart([])}
                className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Clear Cart
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Categories Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white/10 rounded-xl p-6 border border-white/20">
              <h2 className="text-xl font-bold text-white mb-4">Categories</h2>
              <div className="space-y-2">
                {categories.map(category => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                      selectedCategory === category.id
                        ? 'bg-orange-600 text-white'
                        : 'text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Products Grid */}
          <div className="lg:col-span-3">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredItems.map(item => (
                <div key={item.id} className="bg-white/10 rounded-xl p-6 border border-white/20 hover:border-white/40 transition-all duration-300">
                  <div className="text-center mb-4">
                    <div className="text-6xl mb-2">{item.image}</div>
                    <h3 className="text-xl font-bold text-white mb-2">{item.name}</h3>
                    <p className="text-gray-300 text-sm mb-4">{item.description}</p>
                    <div className="text-2xl font-bold text-orange-400 mb-4">${item.price.toFixed(2)}</div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className={`text-sm px-2 py-1 rounded-full ${
                      item.inStock 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {item.inStock ? 'In Stock' : 'Out of Stock'}
                    </span>
                    <button
                      onClick={() => addToCart(item)}
                      disabled={!item.inStock}
                      className="bg-orange-600 hover:bg-orange-500 disabled:bg-gray-500 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      Add to Cart
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Cart Items */}
        {cart.length > 0 && (
          <div className="mt-8 bg-white/10 rounded-xl p-6 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-4">Your Cart</h2>
            <div className="space-y-3">
              {cart.map((item, index) => (
                <div key={`${item.id}-${index}`} className="flex items-center justify-between bg-white/5 rounded-lg p-4">
                  <div className="flex items-center space-x-4">
                    <div className="text-3xl">{item.image}</div>
                    <div>
                      <h3 className="text-white font-semibold">{item.name}</h3>
                      <p className="text-gray-300 text-sm">${item.price.toFixed(2)}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-4 border-t border-white/20">
              <div className="flex items-center justify-between">
                <span className="text-xl text-white font-semibold">Total:</span>
                <span className="text-2xl text-orange-400 font-bold">${getTotalPrice().toFixed(2)}</span>
              </div>
              <button className="w-full mt-4 bg-orange-600 hover:bg-orange-500 text-white py-3 rounded-lg font-semibold transition-colors">
                🛒 Checkout
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HamsterShop;
