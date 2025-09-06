'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { isAdmin } from '@/lib/admin-config';
import { useBehaviorTracking } from '@/hooks/useBehaviorTracking';

interface Task {
  _id: string;
  taskName: string;
  description: string;
  image: string;
  reward: number;
  postedBy: {
    id: string;
    username: string;
  };
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  acceptedBy: Array<{
    id: string;
    username: string;
    acceptedAt: Date;
    completedAt?: Date;
    completionImage?: string;
    completionDescription?: string;
    isWinner: boolean;
  }>;
  winners?: Array<{
    id: string;
    username: string;
    selectedAt: Date;
    reward: number;
  }>;
  createdAt: Date;
  completedAt?: Date;
}

const Hamsterboard: React.FC = () => {
  const { data: session } = useSession();
  const router = useRouter();
  
  // Track hamsterboard visits
  const { trackBehavior } = useBehaviorTracking({
    behaviorType: 'hamsterboard_visit',
    section: 'hamsterboard',
    action: 'view_board'
  });

  const [tasks, setTasks] = useState<Task[]>([]);
  const [showPostForm, setShowPostForm] = useState(false);
  const [newTask, setNewTask] = useState({
    taskName: '',
    description: '',
    reward: '',
    image: ''
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [userBalance, setUserBalance] = useState(0);
  const [filter, setFilter] = useState<'all' | 'open' | 'my-tasks' | 'my-accepted' | 'task-history' | 'accepted-history'>('all');
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [selectedTaskForCompletion, setSelectedTaskForCompletion] = useState<Task | null>(null);
  const [completionImage, setCompletionImage] = useState<File | null>(null);
  const [completionImagePreview, setCompletionImagePreview] = useState<string>('');
  const [completionDescription, setCompletionDescription] = useState<string>('');
  const [isUploadingCompletion, setIsUploadingCompletion] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [showWinnerSelection, setShowWinnerSelection] = useState(false);
  const [selectedTaskForWinner, setSelectedTaskForWinner] = useState<Task | null>(null);
  const [isSelectingWinner, setIsSelectingWinner] = useState(false);
  const [selectedWinners, setSelectedWinners] = useState<string[]>([]);
  const [winnerRewards, setWinnerRewards] = useState<{[key: string]: number}>({});
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string>('');
  const [previewImageTitle, setPreviewImageTitle] = useState<string>('');
  const [showFullImages, setShowFullImages] = useState(false);

  // Check if user is admin (using centralized config)
  const checkAdminStatus = (userId: string) => {
    console.log('Checking admin status for userId:', userId);
    const adminStatus = isAdmin(userId);
    console.log('Is admin?', adminStatus);
    return adminStatus;
  };

  // Check if user is logged in
  useEffect(() => {
    if (!session?.user) {
      router.push('/auth/signin');
    } else {
      console.log('Session user:', session.user);
      console.log('Session user ID:', (session.user as any).id);
    }
  }, [session, router]);

  // Fetch user balance
  useEffect(() => {
    if (session?.user) {
      fetchUserBalance();
    }
  }, [session]);

  // Fetch tasks
  useEffect(() => {
    fetchTasks();
  }, [filter]);

  const fetchUserBalance = async () => {
    try {
      const response = await fetch('/api/currency/balance');
      if (response.ok) {
        const data = await response.json();
        setUserBalance(data.balance);
      }
    } catch (error) {
      console.error('Failed to fetch balance:', error);
    }
  };

  const fetchTasks = async () => {
    try {
      const response = await fetch(`/api/hamsterboard/tasks?filter=${filter}`);
      if (response.ok) {
        const data = await response.json();
        setTasks(data.tasks);
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    }
  };

  const handleImageUpload = async (file: File) => {
    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('image', file);

                        const response = await fetch('/api/hamsterboard/upload-image', {
        method: 'POST',
        body: formData,
      });

                        if (response.ok) {
                    const data = await response.json();
                    setNewTask({ ...newTask, image: data.imageUrl });
                    setImagePreview(data.imageUrl);
                    setImageFile(null);
                  } else {
                    const errorData = await response.json();
                    console.error('Failed to upload image:', errorData.error);
                    alert(`Failed to upload image: ${errorData.error}`);
                  }
    } catch (error) {
      console.error('Error uploading image:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      handleImageUpload(file);
    }
  };

  const handlePostTask = async () => {
    if (!newTask.taskName || !newTask.description || !newTask.reward || !newTask.image) {
      alert('Please fill in all fields and upload an image');
      return;
    }

    const reward = parseFloat(newTask.reward);
    if (reward > userBalance) {
      alert('Insufficient balance to post this task');
      return;
    }

    try {
      setIsPosting(true);
      const response = await fetch('/api/hamsterboard/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskName: newTask.taskName,
          description: newTask.description,
          reward: reward,
          image: newTask.image
        }),
      });

      if (response.ok) {
        alert('Task posted successfully!');
        setShowPostForm(false);
        setNewTask({ taskName: '', description: '', reward: '', image: '' });
        setImagePreview('');
        fetchTasks();
        fetchUserBalance();
      } else {
        const errorData = await response.json();
        alert(`Failed to post task: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error posting task:', error);
      alert('Failed to post task');
    } finally {
      setIsPosting(false);
    }
  };

  const handleAcceptTask = async (taskId: string) => {
    try {
      const response = await fetch('/api/hamsterboard/tasks/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ taskId }),
      });

      if (response.ok) {
        alert('Task accepted successfully!');
        fetchTasks();
      } else {
        const errorData = await response.json();
        alert(`Failed to accept task: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error accepting task:', error);
      alert('Failed to accept task');
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    const task = tasks.find(t => t._id === taskId);
    if (task) {
      setSelectedTaskForCompletion(task);
      setShowCompletionModal(true);
    }
  };

  const handleCompletionImageUpload = async (file: File) => {
    try {
      setIsUploadingCompletion(true);
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/hamsterboard/upload-image', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setCompletionImagePreview(data.imageUrl);
        setCompletionImage(file);
      } else {
        const errorData = await response.json();
        console.error('Upload error details:', errorData);
        alert(`Failed to upload image: ${errorData.error}${errorData.details ? ` - ${errorData.details}` : ''}`);
      }
    } catch (error) {
      console.error('Error uploading completion image:', error);
      alert('Failed to upload completion image');
    } finally {
      setIsUploadingCompletion(false);
    }
  };

  const handleCompletionImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleCompletionImageUpload(file);
    }
  };

  const handleSubmitCompletion = async () => {
    if (!selectedTaskForCompletion || !completionDescription.trim()) {
      alert('Please provide a description of your completion');
      return;
    }

    try {
      setIsCompleting(true);
      const response = await fetch('/api/hamsterboard/tasks/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          taskId: selectedTaskForCompletion._id,
          completionImage: completionImagePreview || null,
          completionDescription: completionDescription.trim()
        }),
      });

      if (response.ok) {
        alert('Task completed successfully! Waiting for poster to select winner.');
        setShowCompletionModal(false);
        setSelectedTaskForCompletion(null);
        setCompletionImage(null);
        setCompletionImagePreview('');
        setCompletionDescription('');
        fetchTasks();
      } else {
        const errorData = await response.json();
        alert(`Failed to complete task: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error completing task:', error);
      alert('Failed to complete task');
    } finally {
      setIsCompleting(false);
    }
  };

  const handleSelectWinner = async (taskId: string) => {
    const task = tasks.find(t => t._id === taskId);
    if (task) {
      setSelectedTaskForWinner(task);
      setShowWinnerSelection(true);
    }
  };

  const handleImagePreview = (imageUrl: string, title: string) => {
    setPreviewImageUrl(imageUrl);
    setPreviewImageTitle(title);
    setShowImagePreview(true);
  };

  const handleConfirmMultipleWinners = async () => {
    if (!selectedTaskForWinner || selectedWinners.length === 0) return;

    // Validate reward distribution
    const totalDistributed = selectedWinners.reduce((sum, id) => sum + (winnerRewards[id] || 0), 0);
    
    if (totalDistributed === 0) {
      alert('Please set reward amounts for the selected winners!');
      return;
    }

    // Check if user has sufficient balance for over-distribution
    if (totalDistributed > selectedTaskForWinner.reward) {
      const extraAmount = totalDistributed - selectedTaskForWinner.reward;
      
      try {
        // Check user's current balance
        const balanceResponse = await fetch('/api/currency/balance');
        if (balanceResponse.ok) {
          const balanceData = await balanceResponse.json();
          const userBalance = balanceData.balance || 0;
          
          if (userBalance < extraAmount) {
            alert(`Insufficient balance! You need $${extraAmount.toFixed(2)} extra but only have $${userBalance.toFixed(2)} in your account.`);
            return;
          }
        }
        
        const confirmOverDistribution = confirm(
          `Warning: You are distributing $${totalDistributed.toFixed(2)} but the task reward is only $${selectedTaskForWinner.reward.toFixed(2)}. This means you will pay $${extraAmount.toFixed(2)} extra from your balance. Continue?`
        );
        if (!confirmOverDistribution) {
          return;
        }
      } catch (error) {
        console.error('Error checking balance:', error);
        alert('Error checking your balance. Please try again.');
        return;
      }
    }

    try {
      setIsSelectingWinner(true);
      const response = await fetch('/api/hamsterboard/tasks/select-winners', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          taskId: selectedTaskForWinner._id,
          winners: selectedWinners.map(id => ({
            id,
            reward: winnerRewards[id] || 0
          }))
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const winnerNames = data.winners.map((w: any) => w.username).join(', ');
        alert(`Winners selected successfully! ${winnerNames} received their rewards. Task has been completed.`);
        setShowWinnerSelection(false);
        setSelectedTaskForWinner(null);
        setSelectedWinners([]);
        setWinnerRewards({});
        fetchTasks();
        fetchUserBalance();
      } else {
        const errorData = await response.json();
        alert(`Failed to select winners: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error selecting winners:', error);
      alert('Failed to select winners');
    } finally {
      setIsSelectingWinner(false);
    }
  };

  const handleConfirmWinner = async (winnerId: string) => {
    if (!selectedTaskForWinner) return;

    try {
      setIsSelectingWinner(true);
      const response = await fetch('/api/hamsterboard/tasks/select-winner', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          taskId: selectedTaskForWinner._id,
          winnerId: winnerId
        }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Winner selected successfully! ${data.winner.username} received ${data.winner.reward} Hamster Coins. Task has been deleted.`);
        setShowWinnerSelection(false);
        setSelectedTaskForWinner(null);
        fetchTasks();
        fetchUserBalance();
      } else {
        const errorData = await response.json();
        alert(`Failed to select winner: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error selecting winner:', error);
      alert('Failed to select winner');
    } finally {
      setIsSelectingWinner(false);
    }
  };

  const handleCancelTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to cancel this task? The reward will be refunded.')) {
      return;
    }

    try {
      const response = await fetch('/api/hamsterboard/tasks/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ taskId }),
      });

      if (response.ok) {
        alert('Task cancelled successfully! Reward has been refunded.');
        fetchTasks();
        fetchUserBalance();
      } else {
        const errorData = await response.json();
        alert(`Failed to cancel task: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error cancelling task:', error);
      alert('Failed to cancel task');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task? This action cannot be undone.')) return;

    try {
      const response = await fetch('/api/hamsterboard/tasks/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ taskId }),
      });

      if (response.ok) {
        alert('Task deleted successfully!');
        fetchTasks();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Failed to delete task');
    }
  };

  if (!session?.user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent mb-2">🐹 Hamsterboard</h1>
          <p className="text-gray-300 text-lg">ทำภารกิจ รับรางวัล</p>
          <div className="mt-4 text-orange-400 font-semibold">
            Your Balance: ${userBalance.toFixed(2)} 🪙
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center mb-8">
          <button
            onClick={() => setShowPostForm(true)}
            className="bg-orange-600 hover:bg-orange-500 text-white px-6 py-3 rounded-lg font-semibold transition-colors mr-4"
          >
            📝 Post New Task
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex justify-center mb-6">
          <div className="bg-white/10 rounded-lg p-1 border border-white/20 overflow-x-auto max-w-full">
            <div className="flex space-x-1">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-md transition-colors whitespace-nowrap ${
                  filter === 'all' ? 'bg-orange-600 text-white' : 'text-gray-300 hover:text-white'
                }`}
              >
                All Tasks
              </button>
              <button
                onClick={() => setFilter('open')}
                className={`px-4 py-2 rounded-md transition-colors whitespace-nowrap ${
                  filter === 'open' ? 'bg-orange-600 text-white' : 'text-gray-300 hover:text-white'
                }`}
              >
                Open Tasks
              </button>
              <button
                onClick={() => setFilter('my-tasks')}
                className={`px-4 py-2 rounded-md transition-colors whitespace-nowrap ${
                  filter === 'my-tasks' ? 'bg-orange-600 text-white' : 'text-gray-300 hover:text-white'
                }`}
              >
                My Posted Tasks
              </button>
              <button
                onClick={() => setFilter('my-accepted')}
                className={`px-4 py-2 rounded-md transition-colors whitespace-nowrap ${
                  filter === 'my-accepted' ? 'bg-orange-600 text-white' : 'text-gray-300 hover:text-white'
                }`}
              >
                My Accepted Tasks
              </button>
              <button
                onClick={() => setFilter('task-history')}
                className={`px-4 py-2 rounded-md transition-colors whitespace-nowrap ${
                  filter === 'task-history' ? 'bg-orange-600 text-white' : 'text-gray-300 hover:text-white'
                }`}
              >
                📚 Task History
              </button>
              <button
                onClick={() => setFilter('accepted-history')}
                className={`px-4 py-2 rounded-md transition-colors whitespace-nowrap ${
                  filter === 'accepted-history' ? 'bg-orange-600 text-white' : 'text-gray-300 hover:text-white'
                }`}
              >
                📖 Accepted History
              </button>
            </div>
          </div>
        </div>

        {/* Task Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tasks.map((task) => {
            const isAdminTask = isAdmin(task.postedBy.id);
            return (
            <div key={task._id} className={`rounded-xl p-6 border transition-all duration-300 ${
              isAdminTask 
                ? 'bg-gradient-to-br from-yellow-900/30 to-amber-900/30 border-yellow-500/40 hover:border-yellow-400/60 shadow-lg shadow-yellow-500/20' 
                : (filter === 'task-history' || filter === 'accepted-history')
                ? 'bg-gradient-to-br from-gray-800/50 to-gray-700/50 border-gray-500/40 hover:border-gray-400/60 shadow-lg shadow-gray-500/20'
                : 'bg-white/10 border-white/20 hover:border-white/40'
            }`}>
              <div className="text-center mb-4">
                <div className="mb-3">
                  {task.image.startsWith('/') ? (
                    <img 
                      src={task.image} 
                      alt={task.taskName}
                      className="w-full h-48 object-cover rounded-lg border border-white/20"
                    />
                  ) : (
                    <div className="w-full h-48 bg-gray-700 rounded-lg border border-white/20 flex items-center justify-center text-4xl">
                      {task.image}
                    </div>
                  )}
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{task.taskName}</h3>
                <p className="text-gray-300 text-sm mb-3">{task.description}</p>
                <div className="text-2xl font-bold text-orange-400 mb-3">${task.reward.toFixed(2)} 🪙</div>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  {/* History indicator */}
                  {(filter === 'task-history' || filter === 'accepted-history') && (
                    <span className="text-xs px-2 py-1 rounded-full bg-gray-600/30 text-gray-300 border border-gray-500/30">
                      📚 {filter === 'task-history' ? 'Task History' : 'Accepted History'}
                    </span>
                  )}
                  
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    task.status === 'open' ? 'bg-green-500/20 text-green-400' :
                    task.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400' :
                    task.status === 'completed' ? 'bg-purple-500/20 text-purple-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {task.status === 'open' ? 'Open' : 
                     task.status === 'in_progress' ? 'In Progress' : 
                     task.status === 'completed' ? 'Completed' : 'Cancelled'}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    isAdminTask 
                      ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' 
                      : 'bg-gray-500/20 text-gray-400'
                  }`}>
                    {isAdminTask ? '👑 ' : ''}Posted by {task.postedBy.username}
                  </span>
                  {task.acceptedBy.length > 0 && (
                    <span className="text-xs px-2 py-1 rounded-full bg-blue-500/20 text-blue-400">
                      {task.acceptedBy.length} Accepted
                    </span>
                  )}
                  {task.winners && task.winners.length > 0 && (
                    <span className="text-xs px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-400">
                      🏆 Winner{task.winners.length > 1 ? 's' : ''}: {task.winners.map(w => w.username).join(', ')}
                    </span>
                  )}
                  
                  {/* Completion date for history */}
                  {(filter === 'task-history' || filter === 'accepted-history') && task.completedAt && (
                    <span className="text-xs px-2 py-1 rounded-full bg-gray-600/30 text-gray-300">
                      📅 {new Date(task.completedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex flex-col space-y-2">
                {(task.status === 'open' || task.status === 'in_progress') && task.postedBy.id !== (session.user as any).id && !task.acceptedBy.some(acceptor => acceptor.id === (session.user as any).id) && (
                  <button
                    onClick={() => handleAcceptTask(task._id)}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    ✅ Accept Task
                  </button>
                )}
                
                {task.status === 'in_progress' && task.acceptedBy.some(acceptor => acceptor.id === (session.user as any).id) && (
                  <button
                    onClick={() => handleCompleteTask(task._id)}
                    className="w-full bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    🎉 Complete Task
                  </button>
                )}
                
                {task.status === 'in_progress' && task.postedBy.id === (session.user as any).id && task.acceptedBy.some(acceptor => acceptor.completedAt) && (
                  <button
                    onClick={() => handleSelectWinner(task._id)}
                    className="w-full bg-yellow-600 hover:bg-yellow-500 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    🏆 Select Winner
                  </button>
                )}
                
                {task.status === 'open' && task.postedBy.id === (session.user as any).id && (
                  <button
                    onClick={() => handleCancelTask(task._id)}
                    className="w-full bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    ❌ Cancel Task
                  </button>
                )}
                
                {/* Admin Delete Button - can delete any task */}
                {isAdmin((session.user as any).id) && (
                  <button
                    onClick={() => handleDeleteTask(task._id)}
                    className="w-full bg-red-800 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    🗑️ Delete Task (Admin)
                  </button>
                )}
              </div>
            </div>
          );
          })}
        </div>

        {tasks.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🐹</div>
            <h2 className="text-2xl font-bold text-white mb-2">No Tasks Found</h2>
            <p className="text-gray-300 mb-4">
              {filter === 'all' ? 'No tasks have been posted yet.' :
               filter === 'open' ? 'No open tasks available.' :
               filter === 'my-tasks' ? 'You haven\'t posted any tasks yet.' :
               'You haven\'t accepted any tasks yet.'}
            </p>
            {filter === 'all' && (
              <button
                onClick={() => setShowPostForm(true)}
                className="bg-orange-600 hover:bg-orange-500 text-white px-6 py-2 rounded-lg transition-colors"
              >
                📝 Post First Task
              </button>
            )}
          </div>
        )}

        {/* Post Task Modal */}
        {showPostForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-xl p-8 border border-white/20 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">Post New Task</h2>
                <p className="text-gray-300">Create a task for other users to complete</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-white text-sm">Task Name</label>
                  <input
                    type="text"
                    value={newTask.taskName}
                    onChange={(e) => setNewTask({ ...newTask, taskName: e.target.value })}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-400"
                    placeholder="Enter task name"
                  />
                </div>

                <div>
                  <label className="text-white text-sm">Description</label>
                  <textarea
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-400 h-24 resize-none"
                    placeholder="Describe what needs to be done"
                  />
                </div>

                <div>
                  <label className="text-white text-sm">Reward (Hamster Coins)</label>
                  <input
                    type="number"
                    value={newTask.reward}
                    onChange={(e) => setNewTask({ ...newTask, reward: e.target.value })}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-400"
                    placeholder="Enter reward amount"
                    min="0"
                    step="0.01"
                  />
                  <p className="text-gray-400 text-xs mt-1">Your balance: ${userBalance.toFixed(2)}</p>
                </div>

                <div>
                  <label className="text-white text-sm">Task Image</label>
                  <input
                    type="file"
                    onChange={handleImageChange}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500"
                    accept="image/*"
                  />
                  {isUploading && <p className="text-blue-400 text-sm mt-1">Uploading image...</p>}
                  {imagePreview && (
                    <div className="mt-2">
                      <img 
                        src={imagePreview} 
                        alt="Preview" 
                        className="w-full h-32 object-cover rounded-lg border border-white/20"
                      />
                    </div>
                  )}
                </div>

                <div className="flex space-x-3 pt-4">
                  {/* Debug info - remove this later */}
                  <div className="w-full mb-2 text-xs text-gray-400">
                    Debug: taskName={newTask.taskName ? '✓' : '✗'}, 
                    description={newTask.description ? '✓' : '✗'}, 
                    reward={newTask.reward ? '✓' : '✗'}, 
                    image={newTask.image ? '✓' : '✗'}, 
                    uploading={isUploading ? '✓' : '✗'}
                  </div>
                  <button
                    onClick={handlePostTask}
                    disabled={isPosting || !newTask.taskName || !newTask.description || !newTask.reward || !newTask.image || isUploading}
                    className="flex-1 bg-orange-600 hover:bg-orange-500 disabled:bg-gray-500 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                  >
                    {isPosting ? 'Posting...' : isUploading ? 'Uploading...' : 'Post Task'}
                  </button>
                  <button
                    onClick={() => {
                      setShowPostForm(false);
                      setNewTask({ taskName: '', description: '', reward: '', image: '' });
                      setImagePreview('');
                    }}
                    className="flex-1 bg-gray-600 hover:bg-gray-500 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Completion Modal */}
        {showCompletionModal && selectedTaskForCompletion && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-xl p-8 border border-white/20 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">Complete Task</h2>
                <p className="text-gray-300">Complete task: {selectedTaskForCompletion.taskName}</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-white text-sm font-semibold">Completion Description *</label>
                  <textarea
                    value={completionDescription}
                    onChange={(e) => setCompletionDescription(e.target.value)}
                    placeholder="Describe how you completed the task..."
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 resize-none"
                    rows={4}
                    required
                  />
                  <p className="text-gray-400 text-xs mt-1">* Required - Please describe your completion</p>
                </div>

                <div>
                  <label className="text-white text-sm">Completion Proof Image (Optional)</label>
                  <input
                    type="file"
                    onChange={handleCompletionImageChange}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500"
                    accept="image/*"
                  />
                  {isUploadingCompletion && <p className="text-blue-400 text-sm mt-1">Uploading image...</p>}
                  {completionImagePreview && (
                    <div className="mt-2">
                      <img 
                        src={completionImagePreview} 
                        alt="Completion proof" 
                        className="w-full h-32 object-cover rounded-lg border border-white/20"
                      />
                    </div>
                  )}
                  <p className="text-gray-400 text-xs mt-1">Optional - Upload an image as proof of completion</p>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={handleSubmitCompletion}
                    disabled={isCompleting || !completionDescription.trim()}
                    className="flex-1 bg-green-600 hover:bg-green-500 disabled:bg-gray-500 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                  >
                    {isCompleting ? 'Submitting...' : 'Submit Completion'}
                  </button>
                  <button
                    onClick={() => {
                      setShowCompletionModal(false);
                      setSelectedTaskForCompletion(null);
                      setCompletionImage(null);
                      setCompletionImagePreview('');
                      setCompletionDescription('');
                    }}
                    className="flex-1 bg-gray-600 hover:bg-gray-500 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Winner Selection Modal */}
        {showWinnerSelection && selectedTaskForWinner && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-xl p-8 border border-white/20 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">Select Winners</h2>
                <p className="text-gray-300">Choose who completed the task best: {selectedTaskForWinner.taskName}</p>
                <p className="text-orange-400 font-semibold mt-2">Total Reward: ${selectedTaskForWinner.reward.toFixed(2)} 🪙</p>
                <p className="text-gray-400 text-sm mt-1">You can select multiple winners and distribute the reward</p>
                
                <div className="mt-4 flex justify-center space-x-4">
                  <button
                    onClick={() => setShowFullImages(!showFullImages)}
                    className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg transition-colors font-semibold"
                  >
                    {showFullImages ? '📏 Show Compact Images' : '🖼️ Show Full Images'}
                  </button>
                  {selectedWinners.length > 0 && (
                    <button
                      onClick={() => {
                        const equalReward = selectedTaskForWinner.reward / selectedWinners.length;
                        const newRewards: {[key: string]: number} = {};
                        selectedWinners.forEach(winnerId => {
                          newRewards[winnerId] = equalReward;
                        });
                        setWinnerRewards(newRewards);
                      }}
                      className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg transition-colors font-semibold"
                    >
                      ⚖️ Distribute Equally
                    </button>
                  )}
                  {selectedWinners.length > 0 && (
                    <button
                      onClick={() => {
                        setSelectedWinners([]);
                        setWinnerRewards({});
                      }}
                      className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg transition-colors font-semibold"
                    >
                      🗑️ Clear Selection
                    </button>
                  )}
                </div>
              </div>

              <div className={`grid ${showFullImages ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'} gap-6`}>
                {selectedTaskForWinner.acceptedBy
                  .filter(acceptor => acceptor.completedAt)
                  .map((acceptor, index) => (
                    <div key={acceptor.id} className={`rounded-lg p-6 border transition-all ${
                      selectedWinners.includes(acceptor.id) 
                        ? 'bg-yellow-500/20 border-yellow-500/50 ring-2 ring-yellow-500/30' 
                        : 'bg-white/10 border-white/20 hover:border-white/40'
                    }`}>
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <span className="text-white font-bold text-lg">{acceptor.username}</span>
                          <div className="text-gray-400 text-sm mt-1">
                            Accepted: {new Date(acceptor.acceptedAt).toLocaleDateString()}
                          </div>
                          <div className="text-green-400 text-sm">
                            Completed: {new Date(acceptor.completedAt!).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-yellow-400 font-semibold">Submission #{index + 1}</div>
                          {selectedWinners.includes(acceptor.id) && (
                            <div className="text-yellow-300 text-sm mt-1">✅ Selected</div>
                          )}
                        </div>
                      </div>
                      
                      {/* Completion Description (Text Content) */}
                      {acceptor.completionDescription && (
                        <div className="mb-4">
                          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-600/30">
                            <h4 className="text-white font-semibold mb-2 flex items-center">
                              📝 Completion Description:
                            </h4>
                            <div className="text-gray-300 whitespace-pre-wrap leading-relaxed">
                              {acceptor.completionDescription}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Completion Image */}
                      {acceptor.completionImage && (
                        <div className="mb-4">
                          <div className="relative group mb-3">
                            <img 
                              src={acceptor.completionImage} 
                              alt="Completion proof" 
                              className={`w-full ${showFullImages ? 'h-96' : 'h-64'} object-contain rounded-lg border border-white/20 cursor-pointer hover:opacity-80 transition-opacity bg-gray-900`}
                              onClick={() => acceptor.completionImage && handleImagePreview(acceptor.completionImage, `${acceptor.username}'s completion proof`)}
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                              <div className="text-white font-semibold">Click to view full size</div>
                            </div>
                          </div>
                          <div className="flex space-x-3">
                            <button
                              onClick={() => window.open(acceptor.completionImage, '_blank')}
                              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition-colors font-semibold"
                            >
                              🔍 View Full Size
                            </button>
                            <button
                              onClick={() => {
                                if (acceptor.completionImage) {
                                  const link = document.createElement('a');
                                  link.href = acceptor.completionImage;
                                  link.download = `completion-proof-${acceptor.username}.jpg`;
                                  link.click();
                                }
                              }}
                              className="flex-1 bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg transition-colors font-semibold"
                            >
                              📥 Download
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Show message if no content */}
                      {!acceptor.completionImage && !acceptor.completionDescription && (
                        <div className="mb-4">
                          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-600/30 text-center">
                            <div className="text-gray-400 italic">
                              No completion content provided
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <div className="space-y-3">
                        {selectedWinners.includes(acceptor.id) ? (
                          <div className="space-y-2">
                            <div className="bg-yellow-500/20 rounded-lg p-3 border border-yellow-500/30">
                              <label className="text-yellow-300 text-sm font-semibold block mb-2">
                                Reward Amount (${selectedTaskForWinner.reward.toFixed(2)} total):
                              </label>
                              <input
                                type="number"
                                min="0"
                                max={selectedTaskForWinner.reward}
                                step="0.01"
                                value={winnerRewards[acceptor.id] || 0}
                                onChange={(e) => {
                                  const newAmount = parseFloat(e.target.value) || 0;
                                  setWinnerRewards(prev => ({
                                    ...prev,
                                    [acceptor.id]: newAmount
                                  }));
                                }}
                                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                                placeholder="Enter reward amount"
                              />
                            </div>
                            <button
                              onClick={() => {
                                const newSelectedWinners = selectedWinners.filter(id => id !== acceptor.id);
                                setSelectedWinners(newSelectedWinners);
                                
                                // Recalculate equal rewards for remaining winners
                                if (newSelectedWinners.length > 0) {
                                  const equalReward = selectedTaskForWinner.reward / newSelectedWinners.length;
                                  const newRewards: {[key: string]: number} = {};
                                  newSelectedWinners.forEach(winnerId => {
                                    newRewards[winnerId] = equalReward;
                                  });
                                  setWinnerRewards(newRewards);
                                } else {
                                  setWinnerRewards({});
                                }
                              }}
                              className="w-full bg-red-600 hover:bg-red-500 text-white px-6 py-3 rounded-lg transition-colors font-bold text-lg"
                            >
                              ❌ Remove from Winners
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              const newSelectedWinners = [...selectedWinners, acceptor.id];
                              setSelectedWinners(newSelectedWinners);
                              
                              // Calculate equal reward for all winners (including new one)
                              const equalReward = selectedTaskForWinner.reward / newSelectedWinners.length;
                              
                              // Update rewards for all winners to be equal
                              const newRewards: {[key: string]: number} = {};
                              newSelectedWinners.forEach(winnerId => {
                                newRewards[winnerId] = equalReward;
                              });
                              setWinnerRewards(newRewards);
                            }}
                            className="w-full bg-yellow-600 hover:bg-yellow-500 text-white px-6 py-3 rounded-lg transition-colors font-bold text-lg"
                          >
                            🏆 Select as Winner
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
              
              <div className="mt-6 space-y-4">
                {/* Reward Summary */}
                {selectedWinners.length > 0 && (
                  <div className="bg-blue-500/20 rounded-lg p-4 border border-blue-500/30">
                    <h3 className="text-blue-300 font-semibold mb-2">Reward Distribution Summary:</h3>
                    <div className="space-y-1">
                      {selectedWinners.map(winnerId => {
                        const acceptor = selectedTaskForWinner.acceptedBy.find(a => a.id === winnerId);
                        const reward = winnerRewards[winnerId] || 0;
                        return (
                          <div key={winnerId} className="flex justify-between text-sm">
                            <span className="text-gray-300">{acceptor?.username}:</span>
                            <span className="text-yellow-400">${reward.toFixed(2)}</span>
                          </div>
                        );
                      })}
                      <div className="border-t border-gray-600 pt-2 mt-2">
                        <div className="flex justify-between font-semibold">
                          <span className="text-white">Total Distributed:</span>
                          <span className="text-orange-400">
                            ${selectedWinners.reduce((sum, id) => sum + (winnerRewards[id] || 0), 0).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Remaining:</span>
                          <span className="text-gray-400">
                            ${(selectedTaskForWinner.reward - selectedWinners.reduce((sum, id) => sum + (winnerRewards[id] || 0), 0)).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex space-x-4">
                  <button
                    onClick={() => handleConfirmMultipleWinners()}
                    disabled={isSelectingWinner || selectedWinners.length === 0}
                    className="flex-1 bg-green-600 hover:bg-green-500 disabled:bg-gray-500 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                  >
                    {isSelectingWinner ? 'Processing...' : `🏆 Confirm ${selectedWinners.length} Winner${selectedWinners.length !== 1 ? 's' : ''}`}
                  </button>
                  <button
                    onClick={() => {
                      setShowWinnerSelection(false);
                      setSelectedTaskForWinner(null);
                      setSelectedWinners([]);
                      setWinnerRewards({});
                    }}
                    className="flex-1 bg-gray-600 hover:bg-gray-500 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Image Preview Modal */}
        {showImagePreview && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-xl p-6 border border-white/20 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="text-center mb-4">
                <h2 className="text-2xl font-bold text-white mb-2">{previewImageTitle}</h2>
              </div>
              
              <div className="flex justify-center mb-4">
                <img 
                  src={previewImageUrl} 
                  alt="Full size preview" 
                  className="max-w-full max-h-[80vh] object-contain rounded-lg border border-white/20 bg-gray-900"
                />
              </div>
              
              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => window.open(previewImageUrl, '_blank')}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg transition-colors"
                >
                  🔍 Open in New Tab
                </button>
                <button
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = previewImageUrl;
                    link.download = `completion-proof-${Date.now()}.jpg`;
                    link.click();
                  }}
                  className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-lg transition-colors"
                >
                  📥 Download
                </button>
                <button
                  onClick={() => {
                    setShowImagePreview(false);
                    setPreviewImageUrl('');
                    setPreviewImageTitle('');
                  }}
                  className="bg-gray-600 hover:bg-gray-500 text-white px-6 py-2 rounded-lg transition-colors"
                >
                  ✕ Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Hamsterboard;

