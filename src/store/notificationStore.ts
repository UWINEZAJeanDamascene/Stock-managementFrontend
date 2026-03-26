import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiClient } from '@/config/api';

// Types matching backend response
export interface Notification {
  _id: string;
  id?: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  company?: string;
  user?: string;
  data?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface NotificationPagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface NotificationState {
  // State
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  pagination: NotificationPagination | null;
  
  // Actions
  fetchNotifications: (page?: number, limit?: number, unreadOnly?: boolean) => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  addNotification: (notification: Notification) => void;
  clearNotifications: () => void;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: [],
      unreadCount: 0,
      loading: false,
      pagination: null,
      
      fetchNotifications: async (page = 1, limit = 20, unreadOnly = false) => {
        set({ loading: true });
        try {
          const params = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
          });
          if (unreadOnly) {
            params.append('unreadOnly', 'true');
          }
          
          const response = await apiClient.get<{
            data: Notification[];
            pagination: NotificationPagination;
            unreadCount: number;
          }>(`/notifications?${params.toString()}`);
          
          set({ 
            notifications: response.data,
            pagination: response.pagination,
            unreadCount: response.unreadCount,
            loading: false 
          });
        } catch (error) {
          console.error('Failed to fetch notifications:', error);
          set({ loading: false });
        }
      },
      
      fetchUnreadCount: async () => {
        try {
          const response = await apiClient.get<{ count: number }>('/notifications/unread-count');
          set({ unreadCount: response.count });
        } catch (error) {
          console.error('Failed to fetch unread count:', error);
        }
      },
      
      markAsRead: async (notificationId) => {
        try {
          await apiClient.put(`/notifications/${notificationId}/read`);
          
          // Update local state
          const notifications = get().notifications.map(n => 
            n._id === notificationId || n.id === notificationId
              ? { ...n, isRead: true, readAt: new Date().toISOString() }
              : n
          );
          const unreadCount = Math.max(0, get().unreadCount - 1);
          
          set({ notifications, unreadCount });
        } catch (error) {
          console.error('Failed to mark notification as read:', error);
        }
      },
      
      markAllAsRead: async () => {
        try {
          await apiClient.put('/notifications/read-all');
          
          // Update local state
          const notifications = get().notifications.map(n => ({
            ...n,
            isRead: true,
            readAt: new Date().toISOString()
          }));
          
          set({ notifications, unreadCount: 0 });
        } catch (error) {
          console.error('Failed to mark all notifications as read:', error);
        }
      },
      
      addNotification: (notification) => {
        set((state) => ({
          notifications: [notification, ...state.notifications],
          unreadCount: state.unreadCount + 1
        }));
      },
      
      clearNotifications: () => {
        set({ 
          notifications: [], 
          unreadCount: 0, 
          pagination: null 
        });
      },
    }),
    {
      name: 'notification-storage',
      partialize: (state) => ({
        notifications: state.notifications,
        unreadCount: state.unreadCount,
      }),
    }
  )
);

// Selectors
export const selectNotifications = (state: NotificationState) => state.notifications;
export const selectUnreadCount = (state: NotificationState) => state.unreadCount;
export const selectNotificationsLoading = (state: NotificationState) => state.loading;
