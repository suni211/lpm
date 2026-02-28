import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import api from '../services/api';
import './NotificationBell.css';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  created_at: string;
}

function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    fetchNotifications();
    connectWebSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const connectWebSocket = async () => {
    try {
      const response = await api.get('/auth/me');
      if (response.data.user) {
        const socket = io(import.meta.env.VITE_API_BASE_URL || 'https://bank.berrple.com', {
          withCredentials: true,
        });

        socket.on('connect', () => {
          socket.emit('authenticate', response.data.user.id);
        });

        socket.on('notification', (notification: Notification) => {
          setNotifications((prev) => [notification, ...prev]);
          setUnreadCount((prev) => prev + 1);
        });

        socketRef.current = socket;
      }
    } catch (error) {
      console.error('WebSocket 연결 실패:', error);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/api/notifications?limit=20');
      setNotifications(response.data.notifications || []);
      
      const unreadResponse = await api.get('/api/notifications/unread-count');
      setUnreadCount(unreadResponse.data.count || 0);
    } catch (error) {
      console.error('알림 조회 실패:', error);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await api.patch(`/api/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('알림 읽음 처리 실패:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.patch('/api/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('알림 일괄 읽음 처리 실패:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return '방금 전';
    if (minutes < 60) return `${minutes}분 전`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}시간 전`;
    return date.toLocaleDateString('ko-KR');
  };

  return (
    <div className="notification-bell">
      <button
        className="bell-button"
        onClick={() => setIsOpen(!isOpen)}
      >
        🔔
        {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
      </button>

      {isOpen && (
        <>
          <div className="notification-overlay" onClick={() => setIsOpen(false)} />
          <div className="notification-dropdown">
            <div className="notification-header">
              <h3>알림</h3>
              {unreadCount > 0 && (
                <button onClick={markAllAsRead} className="mark-all-read">
                  모두 읽음
                </button>
              )}
            </div>
            <div className="notification-list">
              {notifications.length === 0 ? (
                <div className="empty-notifications">알림이 없습니다</div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`notification-item ${!notification.isRead ? 'unread' : ''}`}
                    onClick={() => !notification.isRead && markAsRead(notification.id)}
                  >
                    <div className="notification-icon">
                      {notification.type === 'TRANSACTION' && '💰'}
                      {notification.type === 'APPROVAL' && '✅'}
                      {notification.type === 'SYSTEM' && '🔔'}
                      {notification.type === 'ALERT' && '⚠️'}
                    </div>
                    <div className="notification-content">
                      <div className="notification-title">{notification.title}</div>
                      <div className="notification-message">{notification.message}</div>
                      <div className="notification-time">{formatDate(notification.created_at)}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default NotificationBell;

