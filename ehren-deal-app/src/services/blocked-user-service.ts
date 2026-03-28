import { api } from '@/lib/api';
import type { BlockedUser, Profile } from '@/types';

export interface BlockedUserWithProfile extends BlockedUser {
  blocked: Profile;
}

export const blockedUserService = {
  async getBlockedUsers(): Promise<BlockedUserWithProfile[]> {
    const { data } = await api.get('/blocked-users');
    return data;
  },

  async blockUser(userId: string): Promise<void> {
    await api.post('/blocked-users', { blockedId: userId });
  },

  async unblockUser(userId: string): Promise<void> {
    await api.delete(`/blocked-users/${userId}`);
  },
};
