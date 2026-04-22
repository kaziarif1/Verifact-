import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, ArrowLeft, MessageSquare } from 'lucide-react';
import { messagesService } from '../../services/users.service';
import { Avatar } from '../../components/ui/Avatar';
import { useAuthStore } from '../../store/authStore';
import { timeAgo } from '../../utils/format';
import type { IConversation, IMessage } from '../../types';

export default function MessagesPage() {
  const { user } = useAuthStore();
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const location = useLocation();
  const qc = useQueryClient();
  const [activeId, setActiveId] = useState(sp.get('to') || '');
  const [draft, setDraft] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const pendingPartner = (location.state as { partner?: IConversation['partner'] } | null)?.partner;

  const { data: convos } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => messagesService.getConversations().then(r => r.data.data as IConversation[]),
    refetchInterval: 10_000,
  });

  const { data: messages } = useQuery({
    queryKey: ['messages', activeId],
    queryFn: () => messagesService.getConversation(activeId).then(r => r.data.data as IMessage[]),
    enabled: !!activeId,
    refetchInterval: 5_000,
  });

  const sendMut = useMutation({
    mutationFn: (content:string) => messagesService.sendMessage(activeId, content),
    onSuccess: () => {
      qc.invalidateQueries({queryKey:['messages',activeId]});
      qc.invalidateQueries({queryKey:['conversations']});
      qc.invalidateQueries({queryKey:['conversations','unread-count']});
      setDraft('');
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!activeId) return;
    messagesService.markRead(activeId).finally(() => {
      qc.invalidateQueries({ queryKey:['conversations'] });
      qc.invalidateQueries({ queryKey:['conversations','unread-count'] });
    });
  }, [activeId, qc]);

  const activeConvo = convos?.find(c => c.partner._id === activeId);
  const activePartner = activeConvo?.partner ?? (pendingPartner?._id === activeId ? pendingPartner : undefined);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (draft.trim()) sendMut.mutate(draft.trim());
  };

  return (
    <div>
      <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
        className="pb-4 mb-5" style={{ borderBottom:'3px double var(--rule)' }}>
        <h1 className="font-headline text-4xl font-black" style={{ color:'var(--ink)' }}>Messages</h1>
      </motion.div>

      <div className="flex gap-0" style={{ border:'1px solid var(--paper-mid)', minHeight:500 }}>
        {/* Conversations list */}
        <div className="w-64 flex-shrink-0" style={{ borderRight:'1px solid var(--paper-mid)' }}>
          <div className="p-3 font-sans text-xs font-bold tracking-widest uppercase"
            style={{ borderBottom:'1px solid var(--paper-mid)', color:'var(--ink-faint)' }}>
            Inbox
          </div>
          {!convos || convos.length === 0 ? (
            <div className="p-6 text-center">
              <MessageSquare className="w-8 h-8 mx-auto mb-2" style={{ color:'var(--paper-mid)' }} />
              <p className="font-sans text-xs" style={{ color:'var(--ink-faint)' }}>No conversations yet</p>
            </div>
          ) : (
            convos.map(c => (
              <button key={c.partner._id} onClick={() => setActiveId(c.partner._id)}
                className="w-full flex items-start gap-3 p-3 transition-colors text-left"
                style={{ background: activeId===c.partner._id ? 'var(--paper-mid)' : 'transparent',
                         borderBottom:'1px solid var(--paper-mid)' }}>
                <Avatar src={c.partner.avatarUrl} name={c.partner.displayName} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="font-sans text-xs font-semibold truncate" style={{ color:'var(--ink)' }}>
                    {c.partner.displayName}
                  </p>
                  <p className="font-sans text-xs truncate" style={{ color:'var(--ink-faint)' }}>
                    {c.lastMessage?.content}
                  </p>
                </div>
                {c.unreadCount > 0 && (
                  <span className="font-sans text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                    style={{ background:'var(--ink)', color:'var(--paper)' }}>
                    {c.unreadCount}
                  </span>
                )}
              </button>
            ))
          )}
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col">
          {activeId && activePartner ? (
            <>
              {/* Chat header */}
              <div className="flex items-center gap-3 p-3"
                style={{ borderBottom:'1px solid var(--paper-mid)' }}>
                <button onClick={() => setActiveId('')} className="lg:hidden" style={{ color:'var(--ink)' }}>
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <Avatar src={activePartner.avatarUrl} name={activePartner.displayName} size="sm" />
                <div>
                  <p className="font-sans text-sm font-bold" style={{ color:'var(--ink)' }}>{activePartner.displayName}</p>
                  <p className="font-sans text-xs" style={{ color:'var(--ink-faint)' }}>@{activePartner.username}</p>
                </div>
                <button onClick={() => nav(`/profile/${activePartner.username}`)}
                  className="ml-auto font-sans text-xs hover:underline" style={{ color:'var(--ink-faint)' }}>
                  View profile
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ maxHeight:360 }}>
                <AnimatePresence initial={false}>
                  {(messages ?? []).map(msg => {
                    const isMe = msg.from._id === user?._id;
                    return (
                      <motion.div key={msg._id}
                        initial={{ opacity:0, x: isMe ? 20 : -20 }}
                        animate={{ opacity:1, x:0 }}
                        className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                        {!isMe && <Avatar src={msg.from.avatarUrl} name={msg.from.displayName} size="xs" />}
                        <div className={`max-w-[72%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                          <div className="px-3 py-2 font-sans text-sm"
                            style={{
                              background: isMe ? '#dcf8c6' : 'var(--paper-dark)',
                              color: isMe ? 'var(--paper)' : 'var(--ink)',
                              borderRadius: isMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
                            }}>
                            {msg.content}
                          </div>
                          <p className="font-sans text-xs mt-0.5"
                            style={{ color:'var(--ink-faint)', textAlign: isMe ? 'right' : 'left' }}>
                            {timeAgo(msg.createdAt)}
                          </p>
                        </div>
                        {isMe && <Avatar src={user?.avatarUrl} name={user?.displayName} size="xs" />}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <form onSubmit={handleSend} className="flex gap-2 p-3"
                style={{ borderTop:'1px solid var(--paper-mid)' }}>
                <input value={draft} onChange={e => setDraft(e.target.value)}
                  placeholder="Write a message..."
                  className="input-ink flex-1 !py-2"
                  onKeyDown={e => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e); }}}
                />
                <button type="submit" disabled={!draft.trim() || sendMut.isPending}
                  className="btn-ink !px-3 !py-2">
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 mx-auto mb-3" style={{ color:'var(--paper-mid)' }} />
                <p className="font-headline text-xl" style={{ color:'var(--ink-faint)' }}>Select a conversation</p>
                <p className="font-sans text-sm mt-1" style={{ color:'var(--ink-faint)' }}>
                  Visit a user's profile to start messaging
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
