import { useEffect, useRef } from 'react';

interface RealtimeUpdate {
  type: 'task_created' | 'task_updated' | 'task_deleted' | 'section_created' | 'section_updated' | 'section_deleted' | 'project_updated';
  data: any;
  timestamp: number;
  userId: string;
}

export const useRealtimeUpdates = (
  projectId: string | null,
  onUpdate: (update: RealtimeUpdate) => void
) => {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!projectId) return;

    const connect = () => {
      try {
        const ws = new WebSocket(`ws://localhost:3000/ws/project/${projectId}`);
        
        ws.onopen = () => {
          console.log('🔗 Connected to real-time updates');
        };

        ws.onmessage = (event) => {
          try {
            const update: RealtimeUpdate = JSON.parse(event.data);
            onUpdate(update);
          } catch (error) {
            console.error('Error parsing real-time update:', error);
          }
        };

        ws.onclose = () => {
          console.log('🔌 Disconnected from real-time updates');
          // Reconnect after 3 seconds
          reconnectTimeoutRef.current = setTimeout(connect, 3000);
        };

        ws.onerror = (error) => {
          console.log('WebSocket not available, falling back to polling');
          // Close the WebSocket and start polling
          if (wsRef.current) {
            wsRef.current.close();
          }
          startPolling();
        };

        wsRef.current = ws;
      } catch (error) {
        console.log('WebSocket connection failed, using polling fallback');
        // Fallback to polling if WebSocket fails
        startPolling();
      }
    };

    const startPolling = () => {
      console.log('🔄 Starting polling for real-time updates');
      const pollInterval = setInterval(async () => {
        try {
          const response = await fetch(`/api/projects/${projectId}/updates`);
          if (response.ok) {
            const updates = await response.json();
            updates.forEach((update: RealtimeUpdate) => onUpdate(update));
          }
        } catch (error) {
          console.log('Polling error (this is normal if no updates):', error);
        }
      }, 10000); // Poll every 10 seconds

      return () => clearInterval(pollInterval);
    };

    // Try WebSocket first, fallback to polling
    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [projectId, onUpdate]);
};