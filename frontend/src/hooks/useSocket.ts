import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore } from '../store/notificationStore';
import type { INotification } from '../types';

let socket: Socket | null = null;
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(SOCKET_URL, { withCredentials: true, autoConnect: false });
  }
  return socket;
};

export const useSocket = () => {
  const { isAuthenticated, user } = useAuthStore();
  const addNotification = useNotificationStore(s => s.addNotification);
  const connected = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || connected.current) return;
    const s = getSocket();
    s.connect();
    connected.current = true;

    if (user?._id) s.emit('join:user', user._id);

    s.on('notification', (n: INotification) => addNotification(n));

    return () => {
      s.off('notification');
    };
  }, [isAuthenticated, user?._id, addNotification]);
};

export const useClaimSocket = (
  claimId: string,
  onVoteUpdate: (data: unknown) => void,
  onVerdictSet: (data: unknown) => void,
  onMlResult: (data: unknown) => void,
) => {
  useEffect(() => {
    if (!claimId) return;
    const s = getSocket();
    if (!s.connected) s.connect();
    s.emit('join:claim', claimId);
    s.on('vote:updated', onVoteUpdate);
    s.on('verdict:set', onVerdictSet);
    s.on('ml:result', onMlResult);
    return () => {
      s.emit('leave:claim', claimId);
      s.off('vote:updated', onVoteUpdate);
      s.off('verdict:set', onVerdictSet);
      s.off('ml:result', onMlResult);
    };
  }, [claimId, onVoteUpdate, onVerdictSet, onMlResult]);
};
