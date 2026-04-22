import { useQuery } from '@tanstack/react-query';
import { messagesService } from '../services/users.service';
import { useAuthStore } from '../store/authStore';
import type { IConversation } from '../types';

export const useUnreadMessages = () => {
  const { isAuthenticated } = useAuthStore();

  const query = useQuery({
    queryKey: ['conversations', 'unread-count'],
    queryFn: () => messagesService.getConversations().then(r => r.data.data as IConversation[]),
    enabled: isAuthenticated,
    refetchInterval: 10_000,
  });

  const unreadCount = (query.data ?? []).reduce((sum, convo) => sum + (convo.unreadCount ?? 0), 0);

  return {
    ...query,
    unreadCount,
  };
};
