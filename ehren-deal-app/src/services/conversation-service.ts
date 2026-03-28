import { api } from '@/lib/api';

export const conversationService = {
  async getConversations() {
    const { data } = await api.get('/conversations');
    return data;
  },

  async getOrCreateConversation(listingId: string) {
    const { data } = await api.post('/conversations', { listingId });
    return data;
  },

  async getMessages(conversationId: string, page = 1, limit = 50) {
    const { data } = await api.get(`/conversations/${conversationId}/messages`, { params: { page, limit } });
    return data;
  },

  async sendMessage(conversationId: string, body: string, messageType = 'TEXT') {
    const { data } = await api.post(`/conversations/${conversationId}/messages`, { body, messageType });
    return data;
  },
};
