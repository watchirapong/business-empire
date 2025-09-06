'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { isAdmin as checkIsAdmin } from '@/lib/admin-config';
import { useBehaviorTracking } from '@/hooks/useBehaviorTracking';

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
  contentType?: string;
  textContent?: string;
  linkUrl?: string;
  youtubeUrl?: string;
  allowMultiplePurchases?: boolean;
  requiresRole?: boolean;
  requiredRoleId?: string;
  requiredRoleName?: string;
}

const HamsterShop: React.FC = () => {
  const { data: session } = useSession();
  const router = useRouter();
  
  // Track shop visits
  const { trackBehavior } = useBehaviorTracking({
    behaviorType: 'shop_visit',
    section: 'shop',
    action: 'view_shop'
  });

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
    allowMultiplePurchases: false,
    contentType: 'none',
    textContent: '',
    linkUrl: '',
    youtubeUrl: '',
    fileUrl: '',
    requiresRole: false,
    requiredRoleId: '',
    requiredRoleName: ''
  });
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [purchaseHistory, setPurchaseHistory] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const [showPurchaseSuccess, setShowPurchaseSuccess] = useState(false);
  const [purchasedItem, setPurchasedItem] = useState<any>(null);
  const [hamsterCoinBalance, setHamsterCoinBalance] = useState<number>(0);
  
  // Edit item states
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingItem, setEditingItem] = useState<ShopItem | null>(null);
  const [editItem, setEditItem] = useState({
    name: '',
    description: '',
    price: '',
    image: '',
    inStock: true,
    allowMultiplePurchases: false,
    contentType: 'none',
    textContent: '',
    linkUrl: '',
    youtubeUrl: '',
    fileUrl: '',
    requiresRole: false,
    requiredRoleId: '',
    requiredRoleName: ''
  });
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string>('');
  const [editFileToUpload, setEditFileToUpload] = useState<File | null>(null);
  const [stardustCoinBalance, setStardustCoinBalance] = useState<number>(0);
  const [selectedCurrency, setSelectedCurrency] = useState<'hamstercoin' | 'stardustcoin'>('hamstercoin');
  const [fileUploadError, setFileUploadError] = useState<string>('');
  const [fileUploadSuccess, setFileUploadSuccess] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [youtubeTitles, setYoutubeTitles] = useState<Record<string, string>>({});





  // Check if user is admin
  useEffect(() => {
    if (session?.user) {
      const userId = (session.user as any).id;
      setIsAdmin(checkIsAdmin(userId));
    }
  }, [session]);



  const fetchBalance = async () => {
    try {
      // Fetch HamsterCoin balance
      const hamsterResponse = await fetch('/api/currency/balance');
      const hamsterData = await hamsterResponse.json();
      if (hamsterData.balance !== undefined) {
        setHamsterCoinBalance(hamsterData.balance);
      }

      // Fetch StardustCoin balance
      const stardustResponse = await fetch('/api/stardustcoin/balance');
      const stardustData = await stardustResponse.json();
      if (stardustData.success && stardustData.data.balance !== undefined) {
        setStardustCoinBalance(stardustData.data.balance);
      }
    } catch (error) {
      console.error('Failed to fetch balance:', error);
    }
  };

  const fetchShopItems = async () => {
    try {
      const response = await fetch('/api/shop/items');
      const data = await response.json();
      if (data.items) {
        setShopItems(data.items);

        // Fetch YouTube video titles for items with YouTube URLs
        const titles: Record<string, string> = {};
        const titlePromises = data.items
          .filter((item: ShopItem) => item.youtubeUrl && item.youtubeUrl.trim() !== '')
          .map(async (item: ShopItem) => {
            if (item.youtubeUrl) {
              const videoId = extractYouTubeVideoId(item.youtubeUrl as string);
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
      console.error('Failed to fetch shop items:', error);
    }
  };

  // Fetch shop items and balance
  useEffect(() => {
    fetchShopItems();
    if (session?.user) {
      fetchBalance();
    }
  }, [session]);



  const handleAddItem = async () => {
    console.log('Adding new item...');
    
    if (!newItem.name || !newItem.description || !newItem.price || !imageFile) {
      alert('Please fill in all required fields and upload an image');
      return;
    }

    try {
      // Upload image first
      console.log('Uploading image...');
      const imageUrl = await handleImageUpload();
      if (!imageUrl) {
        alert('Failed to upload image. Please try again.');
        return;
      }
      console.log('Image uploaded:', imageUrl);

      // Create item data
      const itemData = {
        ...newItem,
        image: imageUrl,
        contentType: newItem.contentType || 'none',
        textContent: newItem.textContent || '',
        linkUrl: newItem.linkUrl || '',
        fileUrl: ''
      };

      console.log('Creating item with data:', itemData);
      
      // Create the item
      const response = await fetch('/api/shop/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(itemData),
      });
      
      console.log('Item creation response status:', response.status);
      const responseData = await response.json();
      console.log('Item creation response data:', responseData);

      if (response.ok) {
        const createdItem = responseData.item;
        console.log('Item created successfully:', createdItem);
        
        // Upload file if needed
        if (newItem.contentType === 'file' && fileToUpload) {
          console.log('Uploading file for item:', createdItem.id);
          const fileUploadSuccess = await handleFileUpload(createdItem.id);
          if (fileUploadSuccess) {
            console.log('File uploaded successfully');
          } else {
            console.log('File upload failed');
          }
        }

        // Refresh shop items
        fetchShopItems();
        
        // Reset form
        setNewItem({
          name: '',
          description: '',
          price: '',
          image: '',
          inStock: true,
          allowMultiplePurchases: false,
          contentType: 'none',
          textContent: '',
          linkUrl: '',
          youtubeUrl: '',
          fileUrl: '',
          requiresRole: false,
          requiredRoleId: '',
          requiredRoleName: ''
        });
        setImageFile(null);
        setImagePreview('');
        setFileToUpload(null);
        setShowAddForm(false);
        
        console.log('Item added successfully');
      } else {
        console.error('Failed to add item:', responseData.error);
        alert(`Failed to add item: ${responseData.error}`);
      }
    } catch (error) {
      console.error('Error adding item:', error);
      alert('Error adding item');
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

  const handleEditItem = (item: ShopItem) => {
    setEditingItem(item);
    setEditItem({
      name: item.name,
      description: item.description,
      price: item.price.toString(),
      image: item.image,
      inStock: item.inStock,
      allowMultiplePurchases: item.allowMultiplePurchases || false,
      contentType: item.contentType || 'none',
      textContent: item.textContent || '',
      linkUrl: item.linkUrl || '',
      youtubeUrl: item.youtubeUrl || '',
      fileUrl: item.fileUrl || '',
      requiresRole: item.requiresRole || false,
      requiredRoleId: item.requiredRoleId || '',
      requiredRoleName: item.requiredRoleName || ''
    });
    setEditImagePreview(item.image);
    setShowEditForm(true);
  };

  const handleUpdateItem = async () => {
    if (!editingItem) return;
    
    console.log('Updating item...');
    
    if (!editItem.name || !editItem.description || !editItem.price) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setIsUploading(true);

      // Upload new image if provided
      let imageUrl = editItem.image;
      if (editImageFile) {
        const imageFormData = new FormData();
        imageFormData.append('image', editImageFile);
        
        const imageResponse = await fetch('/api/shop/upload-image', {
          method: 'POST',
          body: imageFormData,
        });
        
        if (imageResponse.ok) {
          const imageData = await imageResponse.json();
          imageUrl = imageData.imageUrl;
        } else {
          alert('Failed to upload image');
          setIsUploading(false);
          return;
        }
      }

      // Upload new file if provided
      let fileUrl = editItem.fileUrl;
      let fileName = '';
      if (editFileToUpload) {
        const fileFormData = new FormData();
        fileFormData.append('file', editFileToUpload);
        
        const fileResponse = await fetch('/api/shop/upload-file', {
          method: 'POST',
          body: fileFormData,
        });
        
        if (fileResponse.ok) {
          const fileData = await fileResponse.json();
          fileUrl = fileData.fileUrl;
          fileName = fileData.fileName;
        } else {
          alert('Failed to upload file');
          setIsUploading(false);
          return;
        }
      }

      // Update item
      const response = await fetch('/api/shop/items', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editingItem.id,
          name: editItem.name,
          description: editItem.description,
          price: editItem.price,
          image: imageUrl,
          inStock: editItem.inStock,
          allowMultiplePurchases: editItem.allowMultiplePurchases,
          contentType: editItem.contentType,
          textContent: editItem.textContent,
          linkUrl: editItem.linkUrl,
          youtubeUrl: editItem.youtubeUrl,
          fileUrl: fileUrl,
          fileName: fileName,
          hasFile: editFileToUpload ? true : editingItem.hasFile,
          requiresRole: editItem.requiresRole,
          requiredRoleId: editItem.requiredRoleId,
          requiredRoleName: editItem.requiredRoleName
        }),
      });

      if (response.ok) {
        // Refresh shop items
        fetchShopItems();
        
        // Reset edit form
        setEditItem({
          name: '',
          description: '',
          price: '',
          image: '',
          inStock: true,
          allowMultiplePurchases: false,
          contentType: 'none',
          textContent: '',
          linkUrl: '',
          youtubeUrl: '',
          fileUrl: '',
          requiresRole: false,
          requiredRoleId: '',
          requiredRoleName: ''
        });
        setEditImageFile(null);
        setEditImagePreview('');
        setEditFileToUpload(null);
        setEditingItem(null);
        setShowEditForm(false);
        
        alert('Item updated successfully!');
      } else {
        const errorData = await response.json();
        alert(`Error updating item: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error updating item:', error);
      alert('Error updating item');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileUpload = async (itemId: string): Promise<boolean> => {
    if (!fileToUpload) {
      setFileUploadError('No file selected for upload');
      return false;
    }

    try {
      setIsUploading(true);
      setFileUploadError('');
      setFileUploadSuccess('Uploading file...');
      
      const formData = new FormData();
      formData.append('file', fileToUpload);
      formData.append('itemId', itemId);

      const response = await fetch('/api/shop/upload-file', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        
        // Update the item in the database
        const updateResponse = await fetch('/api/shop/items', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: itemId,
            fileUrl: data.fileUrl,
            fileName: data.fileName,
            hasFile: true,
            contentType: 'file'
          }),
        });

        if (updateResponse.ok) {
          const updateData = await updateResponse.json();
          console.log('Item updated in database:', updateData);
          
          // Update the item in the shop items list
          setShopItems(prevItems => 
            prevItems.map(item => 
              item.id === itemId 
                ? { ...item, fileUrl: data.fileUrl, hasFile: true, fileName: data.fileName }
                : item
            )
          );
        } else {
          console.error('Failed to update item in database');
        }
        
        setFileToUpload(null);
        setFileUploadSuccess('File uploaded successfully!');
        setTimeout(() => setFileUploadSuccess(''), 3000);
        return true;
      } else {
        const errorData = await response.json();
        setFileUploadError(`Upload failed: ${errorData.error}`);
        return false;
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      setFileUploadError('Network error: Failed to upload file');
      return false;
    } finally {
      setIsUploading(false);
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 50MB for all file types)
      if (file.size > 50 * 1024 * 1024) {
        setFileUploadError('File size must be less than 50MB');
        setFileToUpload(null);
        return;
      }
      
      // Clear previous messages
      setFileUploadError('');
      setFileUploadSuccess('');
      
      setFileToUpload(file);
      setFileUploadSuccess(`File selected: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);
    } else {
      setFileToUpload(null);
      setFileUploadError('');
      setFileUploadSuccess('');
    }
  };

  const handlePurchase = async (itemId: string) => {
    try {
      const response = await fetch('/api/shop/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          itemId,
          currency: selectedCurrency
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Get the purchased item data and show success modal
        const purchasedItemData = data.purchase;
        if (purchasedItemData) {
          console.log('Purchase data received:', purchasedItemData);
          setPurchasedItem(purchasedItemData);
          
                  setShowPurchaseSuccess(true);
        } else {
          console.error('No purchase data received from API');
          alert('Purchase successful, but could not load item details.');
        }
        
        // Refresh purchase history and balance
        fetchPurchaseHistory();
        fetchBalance();
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
      // First get the purchase details to get the itemId
      const purchaseResponse = await fetch('/api/shop/purchase');
      if (!purchaseResponse.ok) {
        alert('Failed to get purchase details');
        return;
      }
      
      const purchaseData = await purchaseResponse.json();
      const purchase = purchaseData.purchases.find((p: any) => p._id === purchaseId);
      
      if (!purchase) {
        alert('Purchase not found');
        return;
      }

      // Use the new direct download endpoint
      const response = await fetch(`/api/shop/download-file/${purchase.itemId}`, {
        method: 'GET',
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        // Get filename from Content-Disposition header or use a default
        const contentDisposition = response.headers.get('content-disposition');
        let filename = 'download';
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

  const handleFixFileItems = async () => {
    try {
      const response = await fetch('/api/shop/fix-file-items', {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Fixed ${data.fixedCount} items with file content type`);
        // Refresh the shop items to show updated data
        fetchShopItems();
      } else {
        console.error('Failed to fix file items');
        alert('Failed to fix file items');
      }
    } catch (error) {
      console.error('Error fixing file items:', error);
      alert('Error fixing file items');
    }
  };



  const handleCheckout = async () => {
    if (cart.length === 0) {
      alert('Your cart is empty');
      return;
    }

    setIsCheckingOut(true);

    try {
      console.log('Cart items being sent to checkout:', cart);
      console.log('Cart item content fields:', cart.map(item => ({
        name: item.name,
        contentType: item.contentType,
        textContent: item.textContent,
        linkUrl: item.linkUrl,
        fileUrl: item.fileUrl,
        hasFile: item.hasFile
      })));
      
      const response = await fetch('/api/shop/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: cart,
          totalAmount: getTotalPrice(),
          currency: selectedCurrency
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Checkout response data:', data);
        console.log('Purchases array:', data.purchases);
        setCart([]);
        
        // Show purchase success modal for cart checkout
        if (data.purchases && data.purchases.length > 0) {
          // For cart checkout, show the first purchased item as representative
          const firstPurchase = data.purchases[0];
          console.log('Purchase data received:', firstPurchase);
          console.log('Content type:', firstPurchase.contentType);
          console.log('Text content:', firstPurchase.textContent);
          console.log('Link URL:', firstPurchase.linkUrl);
          console.log('File URL:', firstPurchase.fileUrl);
          setPurchasedItem({
            _id: firstPurchase.purchaseId || firstPurchase._id, // Use purchase history ID for downloads
            id: firstPurchase.itemId,
            name: firstPurchase.itemName,
            image: firstPurchase.image,
            contentType: firstPurchase.contentType,
            textContent: firstPurchase.textContent,
            linkUrl: firstPurchase.linkUrl,
            fileUrl: firstPurchase.fileUrl,
            hasFile: firstPurchase.hasFile,
            fileName: firstPurchase.fileName
          });
          
          setShowPurchaseSuccess(true);
        } else {
          // Fallback if no purchase data
          alert(`Purchase completed successfully! Your new balance: ${data.newBalance} Hamster Coins`);
        }
        
        // Track purchase behavior
        trackBehavior({
          behaviorType: 'purchase',
          section: 'shop',
          action: 'make_purchase',
          details: {
            totalAmount: getTotalPrice(),
            currency: selectedCurrency,
            itemCount: cart.length,
            items: cart.map(item => ({ id: item.id, name: item.name, price: item.price }))
          }
        });

        // Refresh balance and purchase history after successful checkout
        fetchBalance();
        fetchPurchaseHistory();
      } else {
        const errorData = await response.json();
        if (errorData.error === 'Insufficient Hamster Coins') {
          alert(`Insufficient Hamster Coins! You have ${errorData.currentBalance} coins but need ${errorData.requiredAmount} coins.`);
        } else if (errorData.error && errorData.error.includes('requires the role')) {
          // Special handling for role requirement errors
          const roleName = errorData.requiredRole || 'Unknown Role';
          const itemName = errorData.itemName || 'Item';
          alert(`❌ Access Denied!\n\nItem "${itemName}" requires the Discord role: ${roleName}\n\nPlease make sure you have this role in the Discord server to purchase this item.`);
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

  // Filter items based on search query
  const filteredItems = shopItems.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addToCart = async (item: ShopItem) => {
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
        // If we can't check the role, allow adding to cart but warn the user
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black">
      <div className="container mx-auto px-4 py-8 pb-32">
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
          
          {/* Currency Balances */}
          <div className="mt-4 mb-4 flex flex-wrap justify-center gap-4">
            {/* HamsterCoin Balance */}
            <div className={`inline-flex items-center border rounded-full px-6 py-3 transition-all ${
              selectedCurrency === 'hamstercoin' 
                ? 'bg-gradient-to-r from-yellow-500/30 to-orange-500/30 border-yellow-500/50 ring-2 ring-yellow-500/30' 
                : 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/30'
            }`}>
              <span className="text-2xl mr-2">🪙</span>
              <span className="text-yellow-400 font-bold text-xl">{hamsterCoinBalance.toLocaleString()}</span>
              <span className="text-yellow-300 ml-1">Hamster Coins</span>
            </div>
            
            {/* StardustCoin Balance */}
            <div className={`inline-flex items-center border rounded-full px-6 py-3 transition-all ${
              selectedCurrency === 'stardustcoin' 
                ? 'bg-gradient-to-r from-purple-500/30 to-pink-500/30 border-purple-500/50 ring-2 ring-purple-500/30' 
                : 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-500/30'
            }`}>
              <span className="text-2xl mr-2">✨</span>
              <span className="text-purple-400 font-bold text-xl">{stardustCoinBalance.toLocaleString()}</span>
              <span className="text-purple-300 ml-1">StardustCoin</span>
            </div>
          </div>
          
          {/* Currency Selector */}
          <div className="mt-4 mb-6 flex justify-center">
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
          
          {/* Purchase History Button */}
          <div className="mt-4">
            <button
              onClick={() => router.push('/purchases')}
              className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg transition-colors"
            >
              📦 View Purchase History
            </button>
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
              <button
                onClick={async () => {
                  try {
                    const response = await fetch('/api/test-discord-role?roleId=1388546120912998554');
                    const data = await response.json();
                    console.log('Discord role test result:', data);
                    alert(`Discord Role Test:\n\nUser ID: ${data.userId}\nRole ID: ${data.roleId}\nHas Role: ${data.hasRole}\n\nEnvironment:\nBot Token: ${data.environment.hasBotToken ? 'Configured' : 'Missing'}\nGuild ID: ${data.environment.guildId}`);
                  } catch (error) {
                    console.error('Error testing Discord role:', error);
                    alert('Error testing Discord role validation');
                  }
                }}
                className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg transition-colors"
              >
                🔍 Test Discord Role
              </button>
              <button
                onClick={async () => {
                  try {
                    // Get the first item that requires a role
                    const roleItem = shopItems.find(item => item.requiresRole);
                    if (!roleItem) {
                      alert('No items with role requirements found in the shop.');
                      return;
                    }
                    
                    const response = await fetch(`/api/shop/check-item?itemId=${roleItem.id}`);
                    const data = await response.json();
                    console.log('Item role check result:', data);
                    alert(`Item Role Check:\n\nItem: ${data.item.name}\nRequires Role: ${data.item.requiresRole}\nRole ID: ${data.item.requiredRoleId}\nRole Name: ${data.item.requiredRoleName}`);
                  } catch (error) {
                    console.error('Error checking item role:', error);
                    alert('Error checking item role requirements');
                  }
                }}
                className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-lg transition-colors"
              >
                🔍 Check Item Role
              </button>
              <button
                onClick={async () => {
                  try {
                    // Find all items that should have role requirements but don't
                    const itemsToUpdate = shopItems.filter(item => 
                      item.name.includes('XBOX') || item.name.includes('Game Pass')
                    );
                    
                    if (itemsToUpdate.length === 0) {
                      alert('No XBOX items found to update.');
                      return;
                    }
                    
                    let updatedCount = 0;
                    for (const item of itemsToUpdate) {
                      const response = await fetch(`/api/shop/items?id=${item.id}`, {
                        method: 'PUT',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                          ...item,
                          requiresRole: true,
                          requiredRoleId: '1388546120912998554',
                          requiredRoleName: 'Starway'
                        }),
                      });
                      
                      if (response.ok) {
                        updatedCount++;
                      }
                    }
                    
                    alert(`Updated ${updatedCount} items with role requirements.`);
                    fetchShopItems(); // Refresh the items
                  } catch (error) {
                    console.error('Error updating items:', error);
                    alert('Error updating items with role requirements');
                  }
                }}
                className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded-lg transition-colors"
              >
                🔧 Fix Item Roles
              </button>
              <button
                onClick={handleFixFileItems}
                className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg transition-colors"
              >
                🔧 Fix File Items
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
                    onChange={(e) => {
                      console.log('Dropdown changed to:', e.target.value);
                      setNewItem({...newItem, contentType: e.target.value});
                    }}
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
                    onChange={(e) => {
                      console.log('Text content changed to:', e.target.value);
                      setNewItem({...newItem, textContent: e.target.value});
                    }}
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

              {/* YouTube URL Field - Always visible */}
              <div className="md:col-span-2">
                <label className="text-white text-sm">YouTube Preview Link (Optional)</label>
                <input
                  type="url"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={newItem.youtubeUrl || ''}
                  onChange={(e) => setNewItem({...newItem, youtubeUrl: e.target.value})}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-400"
                />
                <p className="text-gray-400 text-xs mt-1">Add a YouTube link for item preview video</p>
              </div>



              {newItem.contentType === 'file' && (
                <div className="md:col-span-2">
                  <label className="text-white text-sm">File Upload</label>
                  <input
                    type="file"
                    onChange={handleFileChange}
                    disabled={isUploading}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  {isUploading && (
                    <div className="flex items-center gap-2 mt-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                      <span className="text-blue-400 text-sm">Uploading file...</span>
                    </div>
                  )}
                  {fileUploadSuccess && (
                    <p className="text-green-400 text-sm mt-2">{fileUploadSuccess}</p>
                  )}
                  {fileUploadError && (
                    <p className="text-red-400 text-sm mt-2">{fileUploadError}</p>
                  )}
                  {fileToUpload && !isUploading && (
                    <div className="mt-2 p-2 bg-blue-500/20 rounded text-sm text-blue-200">
                      <p>Selected: {fileToUpload.name}</p>
                      <p>Size: {(fileToUpload.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  )}
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
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={newItem.allowMultiplePurchases}
                  onChange={(e) => setNewItem({...newItem, allowMultiplePurchases: e.target.checked})}
                  className="bg-white/10 border border-white/20 rounded"
                />
                <label className="text-white">Allow Multiple Purchases</label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={newItem.requiresRole}
                  onChange={(e) => {
                    const isChecked = e.target.checked;
                    setNewItem({
                      ...newItem, 
                      requiresRole: isChecked,
                      requiredRoleId: isChecked ? '1388546120912998554' : '',
                      requiredRoleName: isChecked ? 'Starway' : ''
                    });
                  }}
                  className="bg-white/10 border border-white/20 rounded"
                />
                <label className="text-white">Require Discord Role</label>
              </div>

              {newItem.requiresRole && (
                <div className="md:col-span-2 space-y-3">
                  <div>
                    <label className="text-white text-sm">Discord Role ID *</label>
                    <input
                      type="text"
                      placeholder="1388546120912998554"
                      value={newItem.requiredRoleId}
                      onChange={(e) => setNewItem({...newItem, requiredRoleId: e.target.value})}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-400"
                    />
                  </div>
                  <div>
                    <label className="text-white text-sm">Role Name (Optional - for display)</label>
                    <input
                      type="text"
                      placeholder="Starway"
                      value={newItem.requiredRoleName}
                      onChange={(e) => setNewItem({...newItem, requiredRoleName: e.target.value})}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-400"
                    />
                  </div>
                </div>
              )}
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

        {/* Admin Edit Item Form */}
        {isAdmin && showEditForm && editingItem && (
          <div className="bg-white/10 rounded-xl p-6 mb-6 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-4">Edit Item: {editingItem.name}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Item Name"
                value={editItem.name}
                onChange={(e) => setEditItem({...editItem, name: e.target.value})}
                className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-400"
              />
              <input
                type="text"
                placeholder="Description"
                value={editItem.description}
                onChange={(e) => setEditItem({...editItem, description: e.target.value})}
                className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-400"
              />
              <input
                type="number"
                step="0.01"
                placeholder="Price"
                value={editItem.price}
                onChange={(e) => setEditItem({...editItem, price: e.target.value})}
                className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-400"
              />
              
              <div className="space-y-2">
                <label className="text-white text-sm">Item Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      const file = e.target.files[0];
                      setEditImageFile(file);
                      const reader = new FileReader();
                      reader.onload = (e) => {
                        setEditImagePreview(e.target?.result as string);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500"
                />
                {editImagePreview && (
                  <div className="mt-2">
                    <img src={editImagePreview} alt="Preview" className="w-20 h-20 object-cover rounded-lg" />
                  </div>
                )}
                <p className="text-gray-400 text-xs">Leave empty to keep current image</p>
              </div>

              <div className="space-y-2">
                <label className="text-white text-sm">Content Type</label>
                <select
                  value={editItem.contentType || 'none'}
                  onChange={(e) => setEditItem({...editItem, contentType: e.target.value})}
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
            {editItem.contentType === 'text' && (
              <div className="mt-4">
                <label className="text-white text-sm">Text Content</label>
                <textarea
                  placeholder="Enter text content..."
                  value={editItem.textContent || ''}
                  onChange={(e) => setEditItem({...editItem, textContent: e.target.value})}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-400 h-24"
                />
              </div>
            )}

            {editItem.contentType === 'link' && (
              <div className="mt-4">
                <label className="text-white text-sm">External Link</label>
                <input
                  type="url"
                  placeholder="https://example.com"
                  value={editItem.linkUrl || ''}
                  onChange={(e) => setEditItem({...editItem, linkUrl: e.target.value})}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-400"
                />
              </div>
            )}

            {/* YouTube URL Field - Always visible */}
            <div className="mt-4">
              <label className="text-white text-sm">YouTube Preview Link (Optional)</label>
              <input
                type="url"
                placeholder="https://www.youtube.com/watch?v=..."
                value={editItem.youtubeUrl || ''}
                onChange={(e) => setEditItem({...editItem, youtubeUrl: e.target.value})}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-400"
              />
              <p className="text-gray-400 text-xs mt-1">Add a YouTube link for item preview video</p>
            </div>

            {editItem.contentType === 'file' && (
              <div className="mt-4">
                <label className="text-white text-sm">File Upload</label>
                <input
                  type="file"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setEditFileToUpload(e.target.files[0]);
                    }
                  }}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500"
                />
                {editFileToUpload && (
                  <div className="mt-2 p-2 bg-white/5 rounded-lg">
                    <p className="text-white text-sm">Selected file: {editFileToUpload.name}</p>
                    <p className="text-gray-400 text-xs">Size: {(editFileToUpload.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                )}
                <p className="text-gray-400 text-xs mt-1">Leave empty to keep current file</p>
              </div>
            )}

            <div className="mt-4 space-y-3">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={editItem.inStock}
                  onChange={(e) => setEditItem({...editItem, inStock: e.target.checked})}
                  className="bg-white/10 border border-white/20 rounded"
                />
                <label className="text-white">In Stock</label>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={editItem.allowMultiplePurchases}
                  onChange={(e) => setEditItem({...editItem, allowMultiplePurchases: e.target.checked})}
                  className="bg-white/10 border border-white/20 rounded"
                />
                <label className="text-white">Allow Multiple Purchases</label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={editItem.requiresRole}
                  onChange={(e) => {
                    const isChecked = e.target.checked;
                    setEditItem({
                      ...editItem, 
                      requiresRole: isChecked,
                      requiredRoleId: isChecked ? '1388546120912998554' : '',
                      requiredRoleName: isChecked ? 'Starway' : ''
                    });
                  }}
                  className="bg-white/10 border border-white/20 rounded"
                />
                <label className="text-white">Require Discord Role</label>
              </div>

              {editItem.requiresRole && (
                <div className="space-y-3">
                  <div>
                    <label className="text-white text-sm">Discord Role ID *</label>
                    <input
                      type="text"
                      placeholder="1388546120912998554"
                      value={editItem.requiredRoleId}
                      onChange={(e) => setEditItem({...editItem, requiredRoleId: e.target.value})}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-400"
                    />
                  </div>
                  <div>
                    <label className="text-white text-sm">Role Name (Optional - for display)</label>
                    <input
                      type="text"
                      placeholder="Starway"
                      value={editItem.requiredRoleName}
                      onChange={(e) => setEditItem({...editItem, requiredRoleName: e.target.value})}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-400"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex space-x-3">
              <button
                onClick={handleUpdateItem}
                disabled={!editItem.name || !editItem.description || !editItem.price || isUploading}
                className="bg-green-600 hover:bg-green-500 disabled:bg-gray-500 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg transition-colors"
              >
                {isUploading ? 'Updating...' : 'Update Item'}
              </button>
              <button
                onClick={() => {
                  setShowEditForm(false);
                  setEditingItem(null);
                  setEditImageFile(null);
                  setEditImagePreview('');
                  setEditFileToUpload(null);
                }}
                className="bg-gray-600 hover:bg-gray-500 text-white px-6 py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}



        {/* Sticky Cart Summary - Bottom Center */}
        {cart.length > 0 && (
          <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-40 bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 shadow-lg min-w-[400px] max-w-[600px]">
            <div className="flex items-center justify-between mb-4">
              <div className="text-white">
                <span className="font-semibold text-lg">Cart ({cart.length} items)</span>
                <span className="ml-4 text-orange-400 font-bold text-xl">${getTotalPrice().toFixed(2)}</span>
              </div>
              <button 
                onClick={() => setCart([])}
                className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Clear Cart
              </button>
            </div>
            <button 
              onClick={handleCheckout}
              disabled={isCheckingOut}
              className="w-full bg-orange-600 hover:bg-orange-500 disabled:bg-gray-500 disabled:cursor-not-allowed text-white py-4 rounded-lg font-semibold transition-colors text-lg"
            >
              {isCheckingOut ? 'Processing...' : '🛒 Checkout Now'}
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6">
          {/* Products Grid */}
          <div className="w-full">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredItems.map(item => (
                <div key={item.id} className={`rounded-xl p-6 transition-all duration-300 relative ${
                  item.requiresRole 
                    ? 'bg-gradient-to-br from-yellow-900/40 to-amber-800/30 border-2 border-yellow-500/60 hover:border-yellow-400/80 shadow-lg shadow-yellow-500/30' 
                    : 'bg-white/10 border border-white/20 hover:border-white/40'
                }`}>
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
                    

                    
                    <div className="text-2xl font-bold text-orange-400 mb-2">${item.price.toFixed(2)}</div>
                    
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
                    <div className="flex space-x-2">
                      <button
                        onClick={() => addToCart(item)}
                        disabled={!item.inStock}
                        className="bg-orange-600 hover:bg-orange-500 disabled:bg-gray-500 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors"
                      >
                        Add to Cart
                      </button>

                      {isAdmin && (
                        <>
                          <button
                            onClick={() => handleEditItem(item)}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded-lg transition-colors"
                            title="Edit Item"
                          >
                            ✏️
                          </button>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="bg-red-600 hover:bg-red-500 text-white px-3 py-2 rounded-lg transition-colors"
                          title="Delete Item"
                        >
                          🗑️
                        </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Cart Items - Detailed View */}
        {cart.length > 0 && (
          <div className="mt-8 bg-white/10 rounded-xl p-6 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-4">Your Cart Details</h2>
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
              <p className="text-gray-400 text-sm mt-2 text-center">
                💡 Use the sticky checkout button in the top-right corner for quick checkout
              </p>
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
                  You&apos;ve successfully purchased <span className="text-orange-400 font-semibold">{purchasedItem.itemName || purchasedItem.name || 'Item'}</span>
                </p>
                
                {/* Item Image */}
                <div className="mb-4">
                  {purchasedItem.image && purchasedItem.image.startsWith('/') ? (
                    <img 
                      src={purchasedItem.image} 
                      alt={purchasedItem.itemName || purchasedItem.name || 'Item'}
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

                {purchasedItem.contentType === 'link' && purchasedItem.linkUrl && (
                  <div className="bg-blue-500/20 rounded-lg p-4 mb-6 border border-blue-500/30">
                    <div className="text-2xl mb-2">🔗</div>
                    <p className="text-blue-300 font-semibold mb-2">Link Content:</p>
                    <a 
                      href={purchasedItem.linkUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 underline break-all"
                    >
                      {purchasedItem.linkUrl}
                    </a>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex space-x-3 mb-4">
                                  {purchasedItem.contentType === 'file' && purchasedItem.hasFile && (
                  <button
                    onClick={() => handleDownload(purchasedItem._id)}
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
};

export default HamsterShop;
