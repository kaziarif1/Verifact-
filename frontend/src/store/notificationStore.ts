import { create } from 'zustand';
import type { INotification } from '../types';

interface NotificationState {
  notifications: INotification[];
  unreadCount: number;
  addNotification: (n: INotification) => void;
  setNotifications: (ns: INotification[], count: number) => void;
  markAllRead: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  addNotification: (n) => set(s => ({
    notifications: [n, ...s.notifications].slice(0, 50),
    unreadCount: s.unreadCount + 1,
  })),
  setNotifications: (notifications, unreadCount) => set({ notifications, unreadCount }),
  markAllRead: () => set(s => ({
    notifications: s.notifications.map(n => ({ ...n, isRead: true })),
    unreadCount: 0,
  })),
}));
