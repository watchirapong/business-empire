import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

interface Notification {
  id: string;
  type: 'due_date' | 'task_assigned' | 'project_update' | 'reminder';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
}

export const useNotifications = () => {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Check for due date reminders
  const checkDueDateReminders = async () => {
    if (!session?.user || !(session.user as any).id) return;

    try {
      const response = await fetch(`/api/notifications/due-dates?userId=${(session.user as any).id}`);
      if (response.ok) {
        const dueTasks = await response.json();
        
        dueTasks.forEach((task: any) => {
          const dueDate = new Date(task.dueDate);
          const now = new Date();
          const hoursUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
          
          if (hoursUntilDue <= 24 && hoursUntilDue > 0) {
            const notification: Notification = {
              id: `due-${task._id}`,
              type: 'due_date',
              title: 'Task Due Soon',
              message: `"${task.title}" is due in ${Math.round(hoursUntilDue)} hours`,
              timestamp: new Date(),
              read: false,
              actionUrl: `/project-manager?project=${task.projectId}`
            };
            
            setNotifications(prev => {
              const exists = prev.find(n => n.id === notification.id);
              if (!exists) {
                return [notification, ...prev];
              }
              return prev;
            });
          }
        });
      }
    } catch (error) {
      console.error('Error checking due date reminders:', error);
    }
  };

  // Check for overdue tasks
  const checkOverdueTasks = async () => {
    if (!session?.user || !(session.user as any).id) return;

    try {
      const response = await fetch(`/api/notifications/overdue?userId=${(session.user as any).id}`);
      if (response.ok) {
        const overdueTasks = await response.json();
        
        overdueTasks.forEach((task: any) => {
          const notification: Notification = {
            id: `overdue-${task._id}`,
            type: 'reminder',
            title: 'Task Overdue',
            message: `"${task.title}" was due ${Math.round((new Date().getTime() - new Date(task.dueDate).getTime()) / (1000 * 60 * 60 * 24))} days ago`,
            timestamp: new Date(),
            read: false,
            actionUrl: `/project-manager?project=${task.projectId}`
          };
          
          setNotifications(prev => {
            const exists = prev.find(n => n.id === notification.id);
            if (!exists) {
              return [notification, ...prev];
            }
            return prev;
          });
        });
      }
    } catch (error) {
      console.error('Error checking overdue tasks:', error);
    }
  };

  // Request notification permission
  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return Notification.permission === 'granted';
  };

  // Show browser notification
  const showBrowserNotification = (notification: Notification) => {
    if (Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        tag: notification.id
      });
    }
  };

  // Mark notification as read
  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
  };

  // Mark all as read
  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  // Clear notification
  const clearNotification = (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  // Update unread count
  useEffect(() => {
    const unread = notifications.filter(n => !n.read).length;
    setUnreadCount(unread);
  }, [notifications]);

  // Check for notifications every 5 minutes
  useEffect(() => {
    if (!session?.user) return;

    const checkNotifications = () => {
      checkDueDateReminders();
      checkOverdueTasks();
    };

    // Initial check
    checkNotifications();
    
    // Request permission for browser notifications
    requestNotificationPermission();

    // Set up interval
    const interval = setInterval(checkNotifications, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [session?.user]);

  // Show browser notifications for new notifications
  useEffect(() => {
    const newNotifications = notifications.filter(n => 
      !n.read && new Date().getTime() - n.timestamp.getTime() < 1000
    );
    
    newNotifications.forEach(showBrowserNotification);
  }, [notifications]);

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotification
  };
};