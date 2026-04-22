import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Users, FileText, Clock, CheckCircle, XCircle, ShieldCheck, AlertTriangle, Activity, Database, Zap, TrendingUp, Trophy } from 'lucide-react';
import { useState } from 'react';
import { adminService } from '../../services/admin.service';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Avatar } from '../../components/ui/Avatar';
import { MLBadge } from '../../components/ui/MLBadge';
import { VoteBar } from '../../components/ui/VoteBar';
import { TrustBadge } from '../../components/ui/TrustBadge';
import { timeAgo, formatDate } from '../../utils/format';
import { cn } from '../../utils/cn';
import toast from 'react-hot-toast';

const STAT_COLORS = ['#DC2626','#16A34A','#2563EB','#D97706'];

export default function AdminDashboard() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<'queue'|'users'|'health'>('queue');
  const [userSearch, setUserSearch] = useState('');

  const { data: stats } = useQuery({
    queryKey: ['admin','dashboard'],
    queryFn: () => adminService.getDashboard().then(r => r.data.data),
  });

  const { data: queue, isLoading: ql } = useQuery({
    queryKey: ['admin','queue'],
    queryFn: () => adminService.getQueue().then(r => r.data),
  });

  const { data: users, isLoading: ul } = useQuery({
    queryKey: ['admin','users', userSearch],
    queryFn: () => adminService.getUsers({ search: userSearch, limit: '20' }).then(r => r.data),
  });

  const { data: healthData } = useQuery({
    queryKey: ['admin','health'],
    queryFn: () => adminService.getHealth().then(r => r.data),
    refetchInterval: 30_000,
  });

  const { data: candidates } = useQuery({
    queryKey: ['admin','candidates'],
    queryFn: () => adminService.getCandidates().then(r => r.data),
  });

  const verdictMut = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: 'Fact'|'Rumor' }) =>
      adminService.setVerdict(id, decision),
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['admin','queue'] });
      qc.invalidateQueries({ queryKey: ['admin','dashboard'] });
      toast.success(`Marked as ${v.decision}`);
    },
    onError: () => toast.error('Failed to set verdict'),
  });

  const verifyMut = useMutation({
    mutationFn: (id: string) => adminService.verifyUser(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin','users'] }); toast.success('User verified'); },
  });

  const banMut = useMutation({
    mutationFn: (id: string) => adminService.banUser(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin','users'] }); toast.success('User ban toggled'); },
  });

  const statCards = stats ? [
    { label: 'Total Users',    value: stats.totalUsers,    icon: Users },
    { label: 'Total Claims',   value: stats.totalClaims,   icon: FileText },
    { label: 'Pending Review', value: stats.pendingClaims, icon: Clock },
    { label: 'Facts Verified', value: stats.factClaims,    icon: CheckCircle },
    { label: 'Rumors Found',   value: stats.rumorClaims,   icon: XCircle },
    { label: 'Verified Users', value: stats.verifiedUsers, icon: ShieldCheck },
  ] : [];

  const trustDist = (stats?.trustDistribution ?? []).map((b: any, i: number) => ({
    range: `${b._id}–${[20,40,60,75,90,100][i] ?? 100}`,
    count: b.count,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ShieldCheck className="w-7 h-7 text-red-600"/>
        <h1 className="font-serif text-2xl font-bold text-slate-900">Admin Panel</h1>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {statCards.map(({ label, value, icon: Icon }, i) => (
          <motion.div key={label} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:i*0.05}}
            className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Icon className="w-4 h-4 text-slate-400"/>
              <span className="text-xs text-slate-500">{label}</span>
            </div>
            <p className="text-2xl font-bold font-mono" style={{color: STAT_COLORS[i % STAT_COLORS.length]}}>{value ?? '—'}</p>
          </motion.div>
        ))}
      </div>

      {/* Trust score distribution chart */}
      {trustDist.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm font-semibold text-slate-700 mb-3">Trust Score Distribution</p>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={trustDist}>
              <XAxis dataKey="range" tick={{fontSize:10}}/>
              <YAxis tick={{fontSize:10}}/>
              <Tooltip/>
              <Bar dataKey="count" radius={[4,4,0,0]}>
                {trustDist.map((_:any, i:number) => <Cell key={i} fill={STAT_COLORS[i % STAT_COLORS.length]}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-0">
        {(['queue','users','health'] as const).map(t => (
          <button key={t} onClick={() => setActiveTab(t as any)}
            className={cn('px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors -mb-px',
              activeTab===t ? 'border-red-600 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-700')}>
            {t === 'queue' ? `Claims Queue (${queue?.meta?.total ?? 0})` : t === 'users' ? 'Users Manager' : 'System Health'}
          </button>
        ))}
      </div>

      {/* Claims queue */}
      {activeTab === 'queue' && (
        <div className="space-y-3">
          {ql && Array.from({length:3}).map((_,i)=><div key={i} className="h-24 bg-slate-200 rounded-xl animate-pulse"/>)}
          {!ql && queue?.data?.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-30"/>
              <p>All claims reviewed! Queue is empty.</p>
            </div>
          )}
          {queue?.data?.map((claim: any) => (
            <div key={claim._id} className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <Avatar src={claim.author?.avatarUrl} name={claim.author?.displayName} size="sm"/>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 text-sm leading-snug">{claim.title}</p>
                  <p className="text-xs text-slate-400">{timeAgo(claim.createdAt)} · @{claim.author?.username}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <MLBadge label={claim.mlPrediction?.label} confidence={claim.mlPrediction?.confidence ?? 0}/>
                <span className="text-xs text-slate-500">Community: </span>
                <VoteBar upPct={claim.voteStats?.upvotePct ?? 50} height="h-1.5" className="w-24"/>
                <span className="text-xs text-slate-500">{claim.voteStats?.totalVotes ?? 0} votes</span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => verdictMut.mutate({id: claim._id, decision: 'Fact'})}
                  loading={verdictMut.isPending} variant="outline"
                  className="flex-1 gap-1 text-green-600 border-green-200 hover:bg-green-50">
                  <CheckCircle className="w-3.5 h-3.5"/> Mark Fact
                </Button>
                <Button size="sm" onClick={() => verdictMut.mutate({id: claim._id, decision: 'Rumor'})}
                  loading={verdictMut.isPending} variant="outline"
                  className="flex-1 gap-1 text-red-600 border-red-200 hover:bg-red-50">
                  <XCircle className="w-3.5 h-3.5"/> Mark Rumor
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Users manager */}
      {activeTab === 'users' && (
        <div className="space-y-3">
          <input value={userSearch} onChange={e => setUserSearch(e.target.value)}
            placeholder="Search users..."
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"/>
          {ul && Array.from({length:5}).map((_,i)=><div key={i} className="h-16 bg-slate-200 rounded-xl animate-pulse"/>)}
          <div className="space-y-2">
            {users?.data?.map((u: any) => (
              <div key={u._id} className="bg-white rounded-xl border border-slate-200 p-3 flex items-center gap-3">
                <Avatar src={u.avatarUrl} name={u.displayName} size="sm"/>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-800">{u.displayName}</p>
                    {u.role === 'verified' && <Badge variant="verified" className="text-[10px] px-1.5 py-0.5">Verified</Badge>}
                    {u.isBanned && <Badge variant="rumor" className="text-[10px] px-1.5 py-0.5">Banned</Badge>}
                  </div>
                  <p className="text-xs text-slate-400">@{u.username} · Joined {formatDate(u.createdAt)}</p>
                </div>
                <TrustBadge score={u.trustScore?.current ?? 50} size="sm"/>
                <div className="flex gap-1.5">
                  {u.role !== 'admin' && u.role !== 'verified' && (
                    <Button size="sm" variant="outline" className="text-xs text-blue-600 border-blue-200 hover:bg-blue-50"
                      onClick={() => verifyMut.mutate(u._id)} loading={verifyMut.isPending}>
                      <ShieldCheck className="w-3.5 h-3.5"/>
                    </Button>
                  )}
                  {u.role !== 'admin' && (
                    <Button size="sm" variant="outline" className={cn('text-xs', u.isBanned ? 'text-green-600 border-green-200' : 'text-red-600 border-red-200')}
                      onClick={() => banMut.mutate(u._id)} loading={banMut.isPending}>
                      <AlertTriangle className="w-3.5 h-3.5"/>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* System health panel */}
      {activeTab === 'health' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {[
              { label: 'Database',   key: 'database',  Icon: Database },
              { label: 'Redis Cache', key: 'redis',    Icon: Zap      },
              { label: 'ML Service', key: 'mlService', Icon: Activity },
            ].map(s => {
              const status = healthData?.services?.[s.key] ?? 'unknown';
              const ok = status === 'connected' || status === 'ok';
              return (
                <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
                  <s.Icon className="w-6 h-6 text-slate-400" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-800">{s.label}</p>
                    <p className={cn('text-xs font-medium capitalize', ok ? 'text-emerald-600' : 'text-red-500')}>
                      {status}
                    </p>
                  </div>
                  <div className={cn('w-2.5 h-2.5 rounded-full', ok ? 'bg-emerald-500 animate-pulse' : 'bg-red-500')}/>
                </div>
              );
            })}
          </div>
          {healthData && (
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-700 mb-1">System Info</p>
              <div className="flex gap-6 text-xs text-slate-500">
                <span>Uptime: <span className="font-medium text-slate-700">{Math.floor((healthData.uptime ?? 0) / 3600)}h {Math.floor(((healthData.uptime ?? 0) % 3600) / 60)}m</span></span>
                <span>Status: <span className={cn('font-medium', healthData.status === 'ok' ? 'text-emerald-600' : 'text-red-500')}>{healthData.status}</span></span>
              </div>
            </div>
          )}
          {/* Verification candidates */}
          {candidates?.data?.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2"><Trophy className="w-4 h-4 text-amber-500" /> Verification Candidates ({candidates.data.length})</p>
              <div className="space-y-2">
                {candidates.data.slice(0, 5).map((u: any) => (
                  <div key={u._id} className="flex items-center gap-3 bg-white rounded-xl border border-slate-200 p-3">
                    <Users className="w-5 h-5 text-slate-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800">{u.displayName}</p>
                      <p className="text-xs text-slate-400">@{u.username} · {u.trustScore?.totalVotesCast} votes cast</p>
                    </div>
                    <span className="text-sm font-bold font-mono text-emerald-600">{Math.round(u.trustScore?.current ?? 0)}</span>
                    <button onClick={() => verifyMut.mutate(u._id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-semibold rounded-lg transition-colors">
                      <ShieldCheck className="w-3.5 h-3.5"/> Verify
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Note: SystemHealth and VerificationCandidates sections are rendered conditionally
// inside the existing AdminDashboard component above.
// They are accessible via the /admin route.
