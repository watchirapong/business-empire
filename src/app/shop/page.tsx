'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { isAdmin as checkIsAdmin } from '@/lib/admin-config';

interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  hasFile: boolean;
  fileUrl?: string;
  fileName?: string;
  inStock: boolean;
}

const HamsterShop: React.FC = () => {
  const { data: session } = useSession();
  const router = useRouter();

  const [cart, setCart] = useState<ShopItem[]>([]);
  const [shopItems, setShopItems] = useState<ShopItem[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState({
    name: '',
    description: '',
    price: '',
    image: '',
    inStock: true,
    contentType: 'none',
    textContent: '',
    linkUrl: '',
    fileUrl: ''
  });
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [purchaseHistory, setPurchaseHistory] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [showDownloadPopup, setShowDownloadPopup] = useState(false);
  const [purchasedItem, setPurchasedItem] = useState<any>(null);





  // Check if user is admin
  useEffect(() => {
    if (session?.user) {
      const userId = (session.user as any).id;
      setIsAdmin(checkIsAdmin(userId));
    }
  }, [session]);



  // Fetch shop items
  useEffect(() => {
    const fetchItems = async () => {
      try {
        const response = await fetch('/api/shop/items');
        const data = await response.json();
        if (data.items) {
          setShopItems(data.items);
        }
      } catch (error) {
        console.error('Failed to fetch shop items:', error);
      }
    };

    fetchItems();
  }, []);



  const handleAddItem = async () => {
    try {
      // Validate required fields including image
      if (!newItem.name || !newItem.description || !newItem.price) {
        alert('Please fill in all required fields');
        return;
      }

      if (!imageFile) {
        alert('Please select an image for the item');
        return;
      }

      // Always upload image first
      const imageUrl = await handleImageUpload();
      if (!imageUrl) {
        alert('Failed to upload image. Please try again.');
        return;
      }

      // Handle file upload if content type is file
      if (newItem.contentType === 'file' && fileToUpload) {
        await handleFileUpload();
        // Wait a moment for the state to update
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Create item data with the uploaded image URL
      const itemData = {
        ...newItem,
        image: imageUrl
      };

      console.log('Sending item data:', itemData);
      const response = await fetch('/api/shop/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(itemData),
      });
      
      console.log('Response status:', response.status);
      const responseData = await response.json();
      console.log('Response data:', responseData);

      if (response.ok) {
        setShopItems([...shopItems, responseData.item]);
        setNewItem({
          name: '',
          description: '',
          price: '',
          image: '',
          inStock: true,
          contentType: 'none',
          textContent: '',
          linkUrl: '',
          fileUrl: ''
        });
        setImageFile(null);
        setImagePreview('');
        setFileToUpload(null);

        setShowAddForm(false);
      } else {
        console.error('Failed to add item');
      }
    } catch (error) {
      console.error('Error adding item:', error);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      const response = await fetch(`/api/shop/items?id=${itemId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setShopItems(shopItems.filter(item => item.id !== itemId));
      } else {
        console.error('Failed to delete item');
      }
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const handleFileUpload = async () => {
    if (!fileToUpload) {
      alert('Please select a file');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', fileToUpload);

      const response = await fetch('/api/shop/upload-file', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setNewItem({ ...newItem, fileUrl: data.fileUrl });
        setFileToUpload(null);
      } else {
        const errorData = await response.json();
        alert(`Failed to upload file: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file');
    }
  };

  const handleImageUpload = async () => {
    if (!imageFile) {
      alert('Please select an image');
      return null;
    }

    try {
      const formData = new FormData();
      formData.append('image', imageFile);

      const response = await fetch('/api/shop/upload-image', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setImageFile(null);
        setImagePreview('');
        return data.imageUrl;
      } else {
        const errorData = await response.json();
        alert(`Failed to upload image: ${errorData.error}`);
        return null;
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image');
      return null;
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePurchase = async (itemId: string) => {
    try {
      const response = await fetch('/api/shop/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ itemId }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Check if the purchased item has a file
        const purchasedItemData = data.purchase;
        if (purchasedItemData && purchasedItemData.hasFile) {
          // Show download popup
          setPurchasedItem(purchasedItemData);
          setShowDownloadPopup(true);
        } else {
          alert('Item purchased successfully!');
        }
        
        // Refresh purchase history
        fetchPurchaseHistory();
      } else {
        const errorData = await response.json();
        alert(`Purchase failed: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error purchasing item:', error);
      alert('Failed to purchase item');
    }
  };

  const handleDownload = async (purchaseId: string) => {
    try {
      const response = await fetch('/api/shop/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ purchaseId }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = ''; // Browser will use the filename from Content-Disposition
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        // Refresh purchase history to update download count
        fetchPurchaseHistory();
      } else {
        const errorData = await response.json();
        alert(`Download failed: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Failed to download file');
    }
  };

  const handleDownloadFromPopup = async () => {
    if (purchasedItem) {
      await handleDownload(purchasedItem._id);
      setShowDownloadPopup(false);
      setPurchasedItem(null);
    }
  };

  const fetchPurchaseHistory = async () => {
    try {
      const response = await fetch('/api/shop/purchase');
      if (response.ok) {
        const data = await response.json();
        setPurchaseHistory(data.purchases);
      }
    } catch (error) {
      console.error('Error fetching purchase history:', error);
    }
  };

  // Fetch purchase history on component mount
  useEffect(() => {
    if (session?.user) {
      fetchPurchaseHistory();
    }
  }, [session]);

  const handleClearAllItems = async () => {
    if (!confirm('Are you sure you want to delete ALL items from the shop? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch('/api/shop/clear-items', {
        method: 'DELETE',
      });

      if (response.ok) {
        const data = await response.json();
        setShopItems([]);
        alert(`Successfully deleted ${data.deletedCount} items from the shop`);
      } else {
        console.error('Failed to clear items');
        alert('Failed to clear items');
      }
    } catch (error) {
      console.error('Error clearing items:', error);
      alert('Error clearing items');
    }
  };



  const handleCheckout = async () => {
    if (cart.length === 0) {
      alert('Your cart is empty');
      return;
    }

    setIsCheckingOut(true);

    try {
      const response = await fetch('/api/shop/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: cart,
          totalAmount: getTotalPrice()
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setCart([]);
        alert(`Purchase completed successfully! Your new balance: ${data.newBalance} Hamster Shop coins`);
      } else {
        const errorData = await response.json();
        if (errorData.error === 'Insufficient Hamster Coins') {
          alert(`Insufficient Hamster Shop coins! You have ${errorData.currentBalance} coins but need ${errorData.requiredAmount} coins.`);
        } else {
          alert(errorData.error || 'Checkout failed');
        }
      }
    } catch (error) {
      console.error('Error during checkout:', error);
      alert('Error during checkout');
    } finally {
      setIsCheckingOut(false);
    }
  };

    const filteredItems = shopItems;

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
        {/* Back Button */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-lg transition-colors"
          >
            ← Back
          </button>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent mb-2">🛒 Hamster Shop</h1>
          <p className="text-gray-300 text-lg">ระบบร้านค้าแฮมสเตอร์ - จัดการสินค้าและเหรียญในร้านค้า</p>
          
          {/* Purchase History Button */}
          <div className="mt-4">
            <button
              onClick={() => router.push('/purchases')}
              className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg transition-colors"
            >
              📦 View Purchase History
            </button>
          </div>
          
          {/* Admin Controls */}
          {isAdmin && (
            <div className="mt-4 space-x-4">
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="bg-orange-600 hover:bg-orange-500 text-white px-6 py-2 rounded-lg transition-colors"
              >
                {showAddForm ? 'Cancel' : '➕ Add New Item'}
              </button>
              <button
                onClick={handleClearAllItems}
                className="bg-red-600 hover:bg-red-500 text-white px-6 py-2 rounded-lg transition-colors"
              >
                🗑️ Clear All Items
              </button>
            </div>
          )}
        </div>

        {/* Admin Add Item Form */}
        {isAdmin && showAddForm && (
          <div className="bg-white/10 rounded-xl p-6 mb-6 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-4">Add New Item</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Item Name"
                value={newItem.name}
                onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-400"
              />
              <input
                type="text"
                placeholder="Description"
                value={newItem.description}
                onChange={(e) => setNewItem({...newItem, description: e.target.value})}
                className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-400"
              />
              <input
                type="number"
                step="0.01"
                placeholder="Price"
                value={newItem.price}
                onChange={(e) => setNewItem({...newItem, price: e.target.value})}
                className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-400"
              />
              
              <div className="space-y-2">
                <label className="text-white text-sm">Content Type (Optional)</label>
                <div className="md:col-span-2">
                  <label className="text-white text-sm">Item Image (Required)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500"
                  />
                  {imagePreview && (
                    <div className="mt-2">
                      <img src={imagePreview} alt="Preview" className="w-20 h-20 object-cover rounded-lg" />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-white text-sm">Additional Content (Optional)</label>
                  <select
                    value={newItem.contentType || 'none'}
                    onChange={(e) => setNewItem({...newItem, contentType: e.target.value})}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white"
                  >
                    <option value="none">No Additional Content</option>
                    <option value="text">Text Content</option>
                    <option value="link">External Link</option>
                    <option value="file">File Upload</option>
                  </select>
                </div>
              </div>

              {/* Conditional content fields based on type */}
              {newItem.contentType === 'text' && (
                <div className="md:col-span-2">
                  <label className="text-white text-sm">Text Content</label>
                  <textarea
                    placeholder="Enter text content..."
                    value={newItem.textContent || ''}
                    onChange={(e) => setNewItem({...newItem, textContent: e.target.value})}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-400 h-24"
                  />
                </div>
              )}

              {newItem.contentType === 'link' && (
                <div className="md:col-span-2">
                  <label className="text-white text-sm">External Link</label>
                  <input
                    type="url"
                    placeholder="https://example.com"
                    value={newItem.linkUrl || ''}
                    onChange={(e) => setNewItem({...newItem, linkUrl: e.target.value})}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-400"
                  />
                </div>
              )}



              {newItem.contentType === 'file' && (
                <div className="md:col-span-2">
                  <label className="text-white text-sm">File Upload</label>
                  <input
                    type="file"
                    onChange={(e) => setFileToUpload(e.target.files?.[0] || null)}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500"
                  />
                </div>
              )}

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={newItem.inStock}
                  onChange={(e) => setNewItem({...newItem, inStock: e.target.checked})}
                  className="bg-white/10 border border-white/20 rounded"
                />
                <label className="text-white">In Stock</label>
              </div>
            </div>
            <button
              onClick={handleAddItem}
              disabled={!newItem.name || !newItem.description || !newItem.price}
              className="mt-4 bg-green-600 hover:bg-green-500 disabled:bg-gray-500 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg transition-colors"
            >
              Add Item
            </button>
          </div>
        )}



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

        <div className="grid grid-cols-1 gap-6">
          {/* Products Grid */}
          <div className="w-full">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredItems.map(item => (
                <div key={item.id} className="bg-white/10 rounded-xl p-6 border border-white/20 hover:border-white/40 transition-all duration-300">
                  <div className="text-center mb-4">
                    <div className="mb-4">
                      {item.image.startsWith('/') ? (
                        <img 
                          src={item.image} 
                          alt={item.name}
                          className="w-24 h-24 object-cover rounded-lg mx-auto border border-white/20"
                        />
                      ) : (
                        <div className="text-6xl">{item.image}</div>
                      )}
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">{item.name}</h3>
                    <p className="text-gray-300 text-sm mb-4">{item.description}</p>
                    <div className="text-2xl font-bold text-orange-400 mb-4">${item.price.toFixed(2)}</div>
                  </div>
                  
                  <div className="flex flex-col space-y-2">
                    <div className="flex items-center justify-between">
                      <span className={`text-sm px-2 py-1 rounded-full ${
                        item.inStock 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {item.inStock ? 'In Stock' : 'Out of Stock'}
                      </span>
                      {item.hasFile && (
                        <span className="text-sm px-2 py-1 rounded-full bg-blue-500/20 text-blue-400">
                          📁 Has File
                        </span>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handlePurchase(item.id)}
                        disabled={!item.inStock}
                        className="bg-green-600 hover:bg-green-500 disabled:bg-gray-500 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors"
                      >
                        💰 Purchase
                      </button>
                      <button
                        onClick={() => addToCart(item)}
                        disabled={!item.inStock}
                        className="bg-orange-600 hover:bg-orange-500 disabled:bg-gray-500 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors"
                      >
                        Add to Cart
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="bg-red-600 hover:bg-red-500 text-white px-3 py-2 rounded-lg transition-colors"
                          title="Delete Item"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
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
                    <div>
                      {item.image.startsWith('/') ? (
                        <img 
                          src={item.image} 
                          alt={item.name}
                          className="w-12 h-12 object-cover rounded-lg border border-white/20"
                        />
                      ) : (
                        <div className="text-3xl">{item.image}</div>
                      )}
                    </div>
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
              <button 
                onClick={handleCheckout}
                disabled={isCheckingOut}
                className="w-full mt-4 bg-orange-600 hover:bg-orange-500 disabled:bg-gray-500 disabled:cursor-not-allowed text-white py-3 rounded-lg font-semibold transition-colors"
              >
                {isCheckingOut ? 'Processing...' : '🛒 Checkout'}
              </button>
            </div>
          </div>
        )}

        {/* Download Popup */}
        {showDownloadPopup && purchasedItem && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-xl p-8 border border-white/20 max-w-md w-full mx-4">
              <div className="text-center">
                <div className="text-6xl mb-4">🎉</div>
                <h2 className="text-2xl font-bold text-white mb-2">Purchase Successful!</h2>
                <p className="text-gray-300 mb-4">
                  You&apos;ve successfully purchased <span className="text-orange-400 font-semibold">{purchasedItem.itemName}</span>
                </p>
                
                <div className="bg-blue-500/20 rounded-lg p-4 mb-6 border border-blue-500/30">
                  <div className="text-4xl mb-2">📁</div>
                  <p className="text-blue-300 font-semibold mb-1">File Available for Download</p>
                  {purchasedItem.fileName && (
                    <p className="text-gray-300 text-sm">{purchasedItem.fileName}</p>
                  )}
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={handleDownloadFromPopup}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                  >
                    📥 Download Now
                  </button>
                  <button
                    onClick={() => {
                      setShowDownloadPopup(false);
                      setPurchasedItem(null);
                    }}
                    className="flex-1 bg-gray-600 hover:bg-gray-500 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                  >
                    Later
                  </button>
                </div>
                
                <p className="text-gray-400 text-sm mt-4">
                  You can also download this file anytime from your <span className="text-blue-400 cursor-pointer" onClick={() => router.push('/purchases')}>Purchase History</span>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HamsterShop;
