import { api } from '@/lib/api';
import type { Notification } from '@/types';

export const notificationService = {
  async getNotifications(): Promise<Notification[]> {
    const { data } = await api.get('/notifications');
    return data;
  },

  async getUnreadCount(): Promise<number> {
    const { data } = await api.get('/notifications/unread-count');
    return data.count;
  },

  async markAsRead(id: string): Promise<void> {
    await api.put(`/notifications/${id}/read`);
  },

  async markAllAsRead(): Promise<void> {
    await api.put('/notifications/read-all');
  },
};
