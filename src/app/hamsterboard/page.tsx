'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

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
  status: 'open' | 'completed' | 'accepted';
  acceptedBy?: {
    id: string;
    username: string;
  };
  createdAt: Date;
  completedAt?: Date;
}

const Hamsterboard: React.FC = () => {
  const { data: session } = useSession();
  const router = useRouter();

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
  const [filter, setFilter] = useState<'all' | 'open' | 'my-tasks' | 'my-accepted'>('all');

  // Check if user is logged in
  useEffect(() => {
    if (!session?.user) {
      router.push('/auth/signin');
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

      const response = await fetch('/api/shop/upload-image', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setNewTask({ ...newTask, image: data.imageUrl });
        setImagePreview(data.imageUrl);
        setImageFile(null);
      } else {
        console.error('Failed to upload image');
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
    try {
      const response = await fetch('/api/hamsterboard/tasks/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ taskId }),
      });

      if (response.ok) {
        alert('Task completed successfully! Reward has been transferred.');
        fetchTasks();
        fetchUserBalance();
      } else {
        const errorData = await response.json();
        alert(`Failed to complete task: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error completing task:', error);
      alert('Failed to complete task');
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
          <p className="text-gray-300 text-lg">Post tasks, complete quests, earn rewards!</p>
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
          <div className="bg-white/10 rounded-lg p-1 border border-white/20">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-md transition-colors ${
                filter === 'all' ? 'bg-orange-600 text-white' : 'text-gray-300 hover:text-white'
              }`}
            >
              All Tasks
            </button>
            <button
              onClick={() => setFilter('open')}
              className={`px-4 py-2 rounded-md transition-colors ${
                filter === 'open' ? 'bg-orange-600 text-white' : 'text-gray-300 hover:text-white'
              }`}
            >
              Open Tasks
            </button>
            <button
              onClick={() => setFilter('my-tasks')}
              className={`px-4 py-2 rounded-md transition-colors ${
                filter === 'my-tasks' ? 'bg-orange-600 text-white' : 'text-gray-300 hover:text-white'
              }`}
            >
              My Posted Tasks
            </button>
            <button
              onClick={() => setFilter('my-accepted')}
              className={`px-4 py-2 rounded-md transition-colors ${
                filter === 'my-accepted' ? 'bg-orange-600 text-white' : 'text-gray-300 hover:text-white'
              }`}
            >
              My Accepted Tasks
            </button>
          </div>
        </div>

        {/* Task Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tasks.map((task) => (
            <div key={task._id} className="bg-white/10 rounded-xl p-6 border border-white/20 hover:border-white/40 transition-all duration-300">
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
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    task.status === 'open' ? 'bg-green-500/20 text-green-400' :
                    task.status === 'accepted' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-purple-500/20 text-purple-400'
                  }`}>
                    {task.status === 'open' ? 'Open' : 
                     task.status === 'accepted' ? 'In Progress' : 'Completed'}
                  </span>
                  <span className="text-xs px-2 py-1 rounded-full bg-gray-500/20 text-gray-400">
                    Posted by {task.postedBy.username}
                  </span>
                  {task.acceptedBy && (
                    <span className="text-xs px-2 py-1 rounded-full bg-blue-500/20 text-blue-400">
                      Accepted by {task.acceptedBy.username}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex flex-col space-y-2">
                {task.status === 'open' && task.postedBy.id !== (session.user as any).id && (
                  <button
                    onClick={() => handleAcceptTask(task._id)}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    ✅ Accept Task
                  </button>
                )}
                
                {task.status === 'accepted' && task.acceptedBy?.id === (session.user as any).id && (
                  <button
                    onClick={() => handleCompleteTask(task._id)}
                    className="w-full bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    🎉 Complete Task
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
              </div>
            </div>
          ))}
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
                  <button
                    onClick={handlePostTask}
                    disabled={isPosting || !newTask.taskName || !newTask.description || !newTask.reward || !newTask.image}
                    className="flex-1 bg-orange-600 hover:bg-orange-500 disabled:bg-gray-500 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                  >
                    {isPosting ? 'Posting...' : 'Post Task'}
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
      </div>
    </div>
  );
};

export default Hamsterboard;
