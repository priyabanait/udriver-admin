import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { useAuth } from '../contexts/AuthContext';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://udrive-backend-1igb.vercel.app';

export default function useNotifications(options = {}) {
  const { recipientType: optRecipientType, recipientId: optRecipientId } = options || {};
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  const { user: auth } = useAuth();

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const token = auth?.token || localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const params = { limit: 20, page: 1 };

        // Prefer explicit options, otherwise infer from auth when possible
        if (optRecipientType && optRecipientId) {
          if (optRecipientType === 'driver') params.driverId = optRecipientId;
          else if (optRecipientType === 'investor') params.investorId = optRecipientId;
          else { params.recipientType = optRecipientType; params.recipientId = optRecipientId; }
        } else if (auth) {
          // For admin users (super_admin, admin, fleet_manager), fetch all notifications
          const isAdmin = auth.role === 'super_admin' || auth.role === 'admin' || auth.role === 'fleet_manager';
          if (isAdmin) {
            // Don't set any filters - fetch all notifications
            console.log('Admin user detected, fetching all notifications');
          } else {
            // Heuristic: if auth token represents an investor (type or role), request investor notifications
            if (auth.type === 'investor' || auth.role === 'investor') {
              if (auth.id) params.investorId = auth.id;
            }
            // Heuristic: driver role
            if (auth.role === 'driver' || auth.type === 'driver') {
              if (auth.id) params.driverId = auth.id;
            }
          }
        }

        const res = await axios.get(`${API_BASE}/api/notifications`, { headers, params });
        if (!mounted) return;
        // API returns { items, pagination }
        const arr = Array.isArray(res.data) ? res.data : (res.data.items || []);
        console.log('Loaded notifications from API:', arr.length, 'notifications');
        console.log('Notification params used:', params);
        setNotifications(arr);
        const unread = (arr || []).filter(n => !n.read).length;
        console.log('Unread notifications:', unread);
        setUnreadCount(unread);
      } catch (err) {
        console.warn('Failed to load notifications', err.message);
        // Set empty state on error to prevent UI issues
        if (mounted) {
          setNotifications([]);
          setUnreadCount(0);
        }
      }
    }

    load();

    // Initialize socket connection
    const socketUrl = import.meta.env.VITE_API_BASE || 'https://udrive-backend-1igb.vercel.app';
    const token = auth?.token || localStorage.getItem('token');
    
    socketRef.current = io(socketUrl, { 
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      auth: token ? { token } : {}
    });

    socketRef.current.on('connect', () => {
      console.log('Socket connected for notifications');
      // Clear any pending reconnection
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      // If we have a recipient context, join the server room to receive targeted notifications
      try {
        const roomType = optRecipientType || auth?.type || auth?.role || null;
        const roomId = optRecipientId || auth?.id || null;
        if (roomType && roomId) {
          socketRef.current.emit('join', { room: `${roomType}:${roomId}` });
          console.log(`Joined notification room: ${roomType}:${roomId}`);
        }
      } catch (e) {
        console.warn('Failed to join notification room', e);
      }
    });

    socketRef.current.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      // Attempt to reconnect if not a manual disconnect
      if (reason === 'io server disconnect') {
        // Server disconnected, reconnect manually
        socketRef.current.connect();
      }
    });

    socketRef.current.on('connect_error', (error) => {
      console.warn('Socket connection error:', error.message);
    });

    socketRef.current.on('dashboard:notification', (payload) => {
      console.log('Received notification via socket:', payload);
      if (mounted) {
        setNotifications(prev => {
          // Avoid duplicates
          const exists = prev.some(n => (n._id || n.id) === (payload._id || payload.id));
          if (exists) {
            console.log('Notification already exists, skipping');
            return prev;
          }
          console.log('Adding new notification to list');
          return [payload, ...prev];
        });
        setUnreadCount(c => {
          const newCount = c + 1;
          console.log('Unread count updated:', newCount);
          return newCount;
        });
      }
    });

    return () => {
      mounted = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        try {
          const roomType = optRecipientType || auth?.type || auth?.role || null;
          const roomId = optRecipientId || auth?.id || null;
          if (roomType && roomId) {
            socketRef.current.emit('leave', { room: `${roomType}:${roomId}` });
          }
        } catch (e) {
          console.warn('Error leaving notification room', e);
        }
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [optRecipientType, optRecipientId, auth?.token, auth?.id, auth?.role, auth?.type]);

  async function markAsRead(id) {
    if (!id) {
      console.warn('markAsRead called without id');
      return;
    }
    
    try {
      const token = auth?.token || localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      await axios.post(`${API_BASE}/api/notifications/${id}/read`, {}, { headers });
      setNotifications(prev => prev.map(n => (n._id === id || n.id === id) ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.warn('Failed to mark as read', err.message);
      // Optimistically update UI even if API call fails
      setNotifications(prev => prev.map(n => (n._id === id || n.id === id) ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  }

  return { notifications, unreadCount, markAsRead };
}
