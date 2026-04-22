import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { ShieldCheck, CalendarDays, Award, UserPlus, UserMinus, MessageSquare } from 'lucide-react';
import { useState } from 'react';
import { usersService } from '../services/users.service';
import { Avatar } from '../components/ui/Avatar';
import { ClaimCard, ClaimCardSkeleton } from '../components/claims/ClaimCard';
import { useAuthStore } from '../store/authStore';
import { formatDate, trustColor } from '../utils/format';
import type { IUser } from '../types';
import toast from 'react-hot-toast';

export default function Profile() {
  const { username } = useParams<{ username:string }>();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { user: me, isAuthenticated } = useAuthStore();
  const [tab, setTab] = useState<'claims'|'history'>('claims');

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', username],
    queryFn: () => usersService.getProfile(username!).then(r => r.data.data as IUser),
    enabled: !!username,
  });

  const { data: postsData } = useQuery({
    queryKey: ['userPosts', username],
    queryFn: () => usersService.getUserPosts(username!).then(r => r.data),
    enabled: !!profile,
  });

  const followMut = useMutation({
    mutationFn: () => profile!.isFollowing
      ? usersService.unfollow(profile!._id)
      : usersService.follow(profile!._id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey:['profile', username] });
      toast.success(profile?.isFollowing ? 'Unfollowed' : 'Following!');
    },
    onError: () => toast.error('Action failed'),
  });

  if (isLoading) return (
    <div className="space-y-4">
      {Array.from({length:3}).map((_,i) => <div key={i} className="skeleton h-16" />)}
    </div>
  );
  if (!profile) return (
    <div className="py-20 text-center">
      <p className="font-headline text-2xl" style={{ color:'var(--ink-faint)' }}>Reporter not found</p>
    </div>
  );

  const historyData = (profile.trustScore.history ?? []).slice(-20).map(h => ({
    date: new Date(h.date).toLocaleDateString('en',{month:'short',day:'numeric'}),
    score: Math.round(h.value),
  }));

  const totalResolved = profile.trustScore.correctVotes + profile.trustScore.incorrectVotes;
  const accuracy = totalResolved > 0 ? ((profile.trustScore.correctVotes/totalResolved)*100).toFixed(1) : 'N/A';
  const isMe = me?._id === profile._id;

  return (
    <div>
      {/* ── Masthead ── */}
      <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
        className="mb-6 pb-5" style={{ borderBottom:'3px double var(--rule)' }}>
        <div className="flex items-start gap-5">
          <Avatar src={profile.avatarUrl} name={profile.displayName} size="xl" />
          <div className="flex-1">
            {/* Name + badges */}
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="font-headline text-3xl font-black" style={{ color:'var(--ink)' }}>
                    {profile.displayName}
                  </h1>
                  {profile.role === 'verified' && (
                    <motion.span initial={{ scale:0 }} animate={{ scale:1 }} transition={{ type:'spring' }}
                      className="inline-flex items-center gap-1 font-sans text-xs font-bold px-2 py-0.5"
                      style={{ background:'var(--verified)', color:'white', borderRadius:'1px', letterSpacing:'0.5px' }}>
                      <ShieldCheck className="w-3 h-3" /> VERIFIED
                    </motion.span>
                  )}
                  {profile.role === 'admin' && (
                    <span className="inline-flex items-center gap-1 font-sans text-xs font-bold px-2 py-0.5"
                      style={{ background:'var(--ink)', color:'var(--paper)', borderRadius:'1px' }}>
                      <Award className="w-3 h-3" /> EDITOR
                    </span>
                  )}
                </div>
                <p className="news-byline mt-0.5">@{profile.username}</p>
                {profile.bio && <p className="font-sans text-sm mt-1.5" style={{ color:'var(--ink-faint)', maxWidth:480, lineHeight:1.5 }}>{profile.bio}</p>}
                <p className="font-sans text-xs mt-2 flex items-center gap-1" style={{ color:'var(--ink-faint)' }}>
                  <CalendarDays className="w-3 h-3" /> Joined {formatDate(profile.createdAt)}
                </p>
              </div>

              {/* Action buttons */}
              {!isMe && (
                <div className="flex gap-2 flex-shrink-0">
                  {isAuthenticated && (
                  <motion.button whileTap={{ scale:0.96 }} onClick={() => followMut.mutate()}
                    disabled={followMut.isPending}
                    className={profile.isFollowing ? 'btn-outline flex items-center gap-1.5 !text-xs !py-2 !px-3' : 'btn-ink flex items-center gap-1.5 !text-xs !py-2 !px-3'}>
                    {profile.isFollowing
                      ? <><UserMinus className="w-3.5 h-3.5" />Unfollow</>
                      : <><UserPlus className="w-3.5 h-3.5" />Follow</>
                    }
                  </motion.button>
                  )}
                  <motion.button whileTap={{ scale:0.96 }}
                    onClick={() => isAuthenticated
                      ? nav(`/messages?to=${profile._id}`, { state: { partner: profile } })
                      : nav('/login')}
                    className="btn-outline flex items-center gap-1.5 !text-xs !py-2 !px-3">
                    <MessageSquare className="w-3.5 h-3.5" /> Send Message
                  </motion.button>
                </div>
              )}
              {isMe && (
                <button onClick={() => nav('/settings')}
                  className="btn-outline !text-xs !py-2 !px-3">Edit Profile</button>
              )}
            </div>

            {/* Follow stats */}
            <div className="flex gap-5 mt-3">
              {[
                { label:'FOLLOWERS', value: profile.followerCount ?? 0 },
                { label:'FOLLOWING', value: profile.followingCount ?? 0 },
                { label:'CLAIMS', value: profile.stats.totalClaims },
              ].map(s => (
                <div key={s.label}>
                  <span className="font-mono text-lg font-black" style={{ color:'var(--ink)' }}>{s.value}</span>
                  <span className="font-sans text-xs ml-1.5 font-semibold tracking-wide" style={{ color:'var(--ink-faint)' }}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label:'TRUST SCORE', value:Math.round(profile.trustScore.current), unit:'/100', color:trustColor(profile.trustScore.current) },
          { label:'ACCURACY', value: accuracy==='N/A' ? 'N/A' : `${accuracy}%`, color:'var(--fact-green)' },
          { label:'VOTES CAST', value:profile.trustScore.totalVotesCast, color:'var(--verified)' },
          { label:'CORRECT', value:profile.trustScore.correctVotes, color:'var(--fact-green)' },
        ].map(s => (
          <motion.div key={s.label} initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
            className="paper-card p-4 text-center"
            style={{ borderTop:`3px solid ${s.color}` }}>
            <p className="font-mono text-2xl font-black" style={{ color:s.color }}>{s.value}</p>
            <p className="font-sans text-xs font-bold tracking-widest uppercase mt-1" style={{ color:'var(--ink-faint)' }}>{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-0 mb-4" style={{ borderBottom:'2px solid var(--rule)' }}>
        {(['claims','history'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="font-sans text-xs font-bold tracking-widest uppercase px-4 py-2"
            style={{
              borderBottom: tab===t ? '2px solid var(--ink)' : '2px solid transparent',
              marginBottom: '-2px',
              color: tab===t ? 'var(--ink)' : 'var(--ink-faint)',
            }}>
            {t === 'claims' ? 'THEIR CLAIMS' : 'TRUST HISTORY'}
          </button>
        ))}
      </div>

      {/* Claims tab */}
      {tab === 'claims' && (
        <div>
          {!postsData?.data?.length ? (
            <p className="font-sans text-sm py-8 text-center" style={{ color:'var(--ink-faint)' }}>No claims yet.</p>
          ) : postsData.data.map((c:any, i:number) => (
            <ClaimCard key={c._id} claim={c} index={i} />
          ))}
        </div>
      )}

      {/* History tab */}
      {tab === 'history' && historyData.length > 1 && (
        <div className="paper-card p-5">
          <p className="font-sans text-xs font-bold tracking-widest uppercase mb-4" style={{ color:'var(--ink-faint)' }}>
            Trust Score Over Time
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={historyData} margin={{ top:4, right:4, bottom:0, left:-20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--paper-mid)" />
              <XAxis dataKey="date" tick={{ fontSize:10, fill:'var(--ink-faint)', fontFamily:'DM Sans' }} />
              <YAxis domain={[0,100]} tick={{ fontSize:10, fill:'var(--ink-faint)' }} />
              <Tooltip contentStyle={{ borderRadius:'0', border:'1px solid var(--rule)', background:'var(--paper)', fontFamily:'DM Sans', fontSize:11 }}
                formatter={(v:any) => [`${v}/100`, 'Score']} />
              <Line type="monotone" dataKey="score" stroke="var(--ink)" strokeWidth={2}
                dot={{ fill:'var(--ink)', r:3 }} activeDot={{ r:5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
