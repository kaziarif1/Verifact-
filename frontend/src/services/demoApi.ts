import type { AdminDecision, ApiResponse, ClaimCategory, FinalVerdict, IClaim, IConversation, IMessage, INotification, IUser, MLLabel, VoteDirection, VoteStats } from '../types';

type DemoRole = 'user' | 'verified' | 'admin';

type DemoUserRecord = IUser & {
  password: string;
  followingIds: string[];
  followerIds: string[];
};

type DemoClaimRecord = Omit<IClaim, 'author' | 'adminDecidedBy'> & {
  authorId: string;
  adminDecidedById?: string;
};

type DemoMessageRecord = {
  _id: string;
  fromId: string;
  toId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
};

type DemoNotificationRecord = INotification & {
  recipientId: string;
};

type DemoVoteRecord = {
  claimId: string;
  userId: string;
  direction: VoteDirection;
};

type DemoDb = {
  users: DemoUserRecord[];
  claims: DemoClaimRecord[];
  votes: DemoVoteRecord[];
  messages: DemoMessageRecord[];
  notifications: DemoNotificationRecord[];
};

type RequestConfig = {
  params?: Record<string, string>;
  headers?: Record<string, string>;
};

type DemoResponse<T> = Promise<{ data: T }>;

const STORAGE_KEY = 'verifact-demo-db-v1';
const DEMO_MODE = import.meta.env.VITE_DEMO_MODE !== 'false';
const ADMIN_EMAIL = 'kazarif02@gmail.com';
const ADMIN_PASSWORD = '%Karif10%';

const nowIso = () => new Date().toISOString();
const makeId = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;

const deepClone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const baseTrustScore = (score: number, totalVotesCast = 0, correctVotes = 0, incorrectVotes = 0) => ({
  current: score,
  history: [{ date: nowIso(), value: score, reason: 'seed' }],
  totalVotesCast,
  correctVotes,
  incorrectVotes,
  pendingVotes: 0,
  lastCalculatedAt: nowIso(),
});

const buildVoteStats = (upvotes: number, downvotes: number): VoteStats => {
  const totalVotes = upvotes + downvotes;
  const upvotePct = totalVotes ? (upvotes / totalVotes) * 100 : 50;
  const trustedUpvotes = Math.floor(upvotes * 0.35);
  const trustedDownvotes = Math.floor(downvotes * 0.35);
  const trustedTotalVotes = trustedUpvotes + trustedDownvotes;
  const trustedUpvotePct = trustedTotalVotes ? (trustedUpvotes / trustedTotalVotes) * 100 : upvotePct;

  return {
    totalUpvotes: upvotes,
    totalDownvotes: downvotes,
    totalVotes,
    upvotePct,
    downvotePct: 100 - upvotePct,
    trustedUpvotes,
    trustedDownvotes,
    trustedTotalVotes,
    trustedUpvotePct,
    weightedScore: totalVotes ? Math.round(((upvotePct * 0.7) + (trustedUpvotePct * 0.3)) * 10) / 10 : 50,
  };
};

const getMlPrediction = (text: string) => {
  const normalized = text.toLowerCase();
  const factSignals = ['official', 'confirmed', 'research', 'report', 'verified', 'evidence', 'study'];
  const rumorSignals = ['rumor', 'viral', 'unconfirmed', 'alleged', 'whatsapp', 'facebook', 'leaked'];
  const factScore = factSignals.reduce((score, token) => score + Number(normalized.includes(token)), 0);
  const rumorScore = rumorSignals.reduce((score, token) => score + Number(normalized.includes(token)), 0);

  let label: MLLabel = 'UNCERTAIN';
  if (factScore > rumorScore) label = 'FACT';
  if (rumorScore > factScore) label = 'RUMOR';

  const confidence = label === 'UNCERTAIN'
    ? 0.5
    : Math.min(0.92, 0.58 + Math.abs(factScore - rumorScore) * 0.08);

  return {
    label,
    confidence,
    modelVersion: 'demo-heuristic-v1',
    processedAt: nowIso(),
  };
};

const seedDb = (): DemoDb => {
  const createdAt = nowIso();

  const adminId = 'user_admin_demo';
  const user1Id = 'user_sadia_demo';
  const user2Id = 'user_tanvir_demo';

  const users: DemoUserRecord[] = [
    {
      _id: adminId,
      email: ADMIN_EMAIL,
      username: 'kazarif02',
      displayName: 'Kazi Arif',
      bio: 'Lead editor reviewing claims in demo mode.',
      avatarUrl: '',
      role: 'admin',
      isEmailVerified: true,
      isBanned: false,
      trustScore: baseTrustScore(95, 40, 34, 6),
      stats: { totalClaims: 1, factsPosted: 1, rumorsPosted: 0 },
      createdAt,
      updatedAt: createdAt,
      password: ADMIN_PASSWORD,
      followingIds: [user1Id],
      followerIds: [user1Id, user2Id],
    },
    {
      _id: user1Id,
      email: 'sadia@example.com',
      username: 'sadia_reports',
      displayName: 'Sadia Rahman',
      bio: 'Covers civic issues and digital misinformation.',
      avatarUrl: '',
      role: 'verified',
      isEmailVerified: true,
      isBanned: false,
      trustScore: baseTrustScore(82, 28, 21, 7),
      stats: { totalClaims: 1, factsPosted: 1, rumorsPosted: 0 },
      createdAt,
      updatedAt: createdAt,
      password: 'Password123',
      followingIds: [adminId, user2Id],
      followerIds: [adminId],
    },
    {
      _id: user2Id,
      email: 'tanvir@example.com',
      username: 'tanvir_watch',
      displayName: 'Tanvir Hasan',
      bio: 'Tracks fast-moving rumors shared on social media.',
      avatarUrl: '',
      role: 'user',
      isEmailVerified: true,
      isBanned: false,
      trustScore: baseTrustScore(64, 12, 7, 5),
      stats: { totalClaims: 1, factsPosted: 0, rumorsPosted: 1 },
      createdAt,
      updatedAt: createdAt,
      password: 'Password123',
      followingIds: [adminId],
      followerIds: [user1Id],
    },
  ];

  const claims: DemoClaimRecord[] = [
    {
      _id: 'claim_fact_demo',
      authorId: user1Id,
      title: 'City authority confirms the bridge repair deadline remains on schedule',
      body: 'An official report and public statement say the repair work is still expected to finish this month.',
      category: 'politics',
      media: { type: 'none' },
      voteStats: buildVoteStats(18, 4),
      mlPrediction: { label: 'FACT', confidence: 0.84, modelVersion: 'demo-heuristic-v1', processedAt: createdAt },
      adminDecision: 'Fact',
      adminNote: 'The city notice and contractor update matched the submitted claim.',
      adminDecidedById: adminId,
      adminDecidedAt: createdAt,
      finalVerdict: 'Fact',
      trendingScore: 92,
      viewCount: 123,
      isDeleted: false,
      createdAt,
      updatedAt: createdAt,
    },
    {
      _id: 'claim_rumor_demo',
      authorId: user2Id,
      title: 'Viral post claims schools will shut for three weeks because of a secret circular',
      body: 'No official circular has been published, and the claim appears to come from forwarded social media screenshots.',
      category: 'health',
      media: { type: 'none' },
      voteStats: buildVoteStats(5, 16),
      mlPrediction: { label: 'RUMOR', confidence: 0.81, modelVersion: 'demo-heuristic-v1', processedAt: createdAt },
      adminDecision: 'Rumor',
      adminNote: 'We could not verify any official notice from the education board.',
      adminDecidedById: adminId,
      adminDecidedAt: createdAt,
      finalVerdict: 'Rumor',
      trendingScore: 88,
      viewCount: 204,
      isDeleted: false,
      createdAt,
      updatedAt: createdAt,
    },
    {
      _id: 'claim_pending_demo',
      authorId: adminId,
      title: 'Researchers release an early report about solar panel efficiency gains',
      body: 'The claim cites a study preview, but the full peer-reviewed paper is not yet available.',
      category: 'science',
      media: { type: 'none' },
      voteStats: buildVoteStats(7, 5),
      mlPrediction: { label: 'UNCERTAIN', confidence: 0.52, modelVersion: 'demo-heuristic-v1', processedAt: createdAt },
      adminDecision: 'Processing',
      finalVerdict: 'Pending',
      trendingScore: 61,
      viewCount: 77,
      isDeleted: false,
      createdAt,
      updatedAt: createdAt,
    },
  ];

  const votes: DemoVoteRecord[] = [
    { claimId: 'claim_fact_demo', userId: adminId, direction: 'up' },
    { claimId: 'claim_fact_demo', userId: user2Id, direction: 'up' },
    { claimId: 'claim_rumor_demo', userId: adminId, direction: 'down' },
    { claimId: 'claim_pending_demo', userId: user1Id, direction: 'up' },
  ];

  const messages: DemoMessageRecord[] = [
    {
      _id: 'msg_demo_1',
      fromId: user1Id,
      toId: adminId,
      content: 'Can you review the bridge claim when you have time?',
      isRead: true,
      createdAt,
    },
    {
      _id: 'msg_demo_2',
      fromId: adminId,
      toId: user1Id,
      content: 'Yes, I already checked the official statement and updated it.',
      isRead: true,
      createdAt,
    },
  ];

  const notifications: DemoNotificationRecord[] = [
    {
      _id: 'notif_demo_1',
      recipientId: user1Id,
      type: 'verdict_set',
      title: 'Your claim has been reviewed',
      message: 'The bridge repair claim was marked as Fact.',
      link: '/claims/claim_fact_demo',
      isRead: false,
      createdAt,
    },
    {
      _id: 'notif_demo_2',
      recipientId: adminId,
      type: 'new_message',
      title: 'New message',
      message: 'Sadia Rahman sent you a direct message.',
      link: '/messages?to=user_sadia_demo',
      isRead: false,
      createdAt,
    },
  ];

  return { users, claims, votes, messages, notifications };
};

const ensureDb = (): DemoDb => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seeded = seedDb();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }

  try {
    return JSON.parse(raw) as DemoDb;
  } catch {
    const seeded = seedDb();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }
};

const saveDb = (db: DemoDb) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
};

const getCurrentUserId = () => {
  const token = localStorage.getItem('accessToken');
  if (!token?.startsWith('demo-token-')) return null;
  return token.replace('demo-token-', '');
};

const requireAuth = (db: DemoDb) => {
  const userId = getCurrentUserId();
  if (!userId) throw apiError('Authentication required', 401, 'UNAUTHENTICATED');
  const user = db.users.find((entry) => entry._id === userId);
  if (!user) throw apiError('Authentication required', 401, 'UNAUTHENTICATED');
  return user;
};

const toPublicUser = (user: DemoUserRecord, viewerId?: string | null): IUser => ({
  _id: user._id,
  email: user.email,
  username: user.username,
  displayName: user.displayName,
  bio: user.bio,
  avatarUrl: user.avatarUrl,
  role: user.role,
  isEmailVerified: user.isEmailVerified,
  isBanned: user.isBanned,
  trustScore: deepClone(user.trustScore),
  stats: deepClone(user.stats),
  followerCount: user.followerIds.length,
  followingCount: user.followingIds.length,
  isFollowing: Boolean(viewerId && user.followerIds.includes(viewerId)),
  verifiedAt: user.verifiedAt,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const decorateClaim = (db: DemoDb, claim: DemoClaimRecord, viewerId?: string | null): IClaim => {
  const author = db.users.find((user) => user._id === claim.authorId)!;
  const admin = claim.adminDecidedById
    ? db.users.find((user) => user._id === claim.adminDecidedById)
    : undefined;
  const myVote = viewerId
    ? db.votes.find((vote) => vote.claimId === claim._id && vote.userId === viewerId)?.direction ?? null
    : null;

  return {
    ...deepClone(claim),
    author: toPublicUser(author, viewerId),
    adminDecidedBy: admin ? { username: admin.username, displayName: admin.displayName } : undefined,
    myVote,
  };
};

const decorateMessage = (db: DemoDb, message: DemoMessageRecord): IMessage => {
  const from = db.users.find((user) => user._id === message.fromId)!;
  return {
    _id: message._id,
    from: toPublicUser(from),
    to: message.toId,
    content: message.content,
    isRead: message.isRead,
    createdAt: message.createdAt,
  };
};

const apiError = (message: string, status = 400, code = 'BAD_REQUEST') => {
  const error = {
    response: {
      status,
      data: {
        error: { code, message },
      },
    },
  };
  return error;
};

const ok = <T>(payload: T): DemoResponse<T> => Promise.resolve({ data: payload });
const fail = (message: string, status?: number, code?: string) => Promise.reject(apiError(message, status, code));

const stripPassword = (user: DemoUserRecord) => toPublicUser(user, user._id);

const sortClaims = (claims: DemoClaimRecord[], sort = 'newest') => {
  const copy = [...claims];
  if (sort === 'trending') return copy.sort((a, b) => b.trendingScore - a.trendingScore);
  if (sort === 'mostVoted') return copy.sort((a, b) => b.voteStats.totalVotes - a.voteStats.totalVotes);
  return copy.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
};

const refreshClaimVoteStats = (db: DemoDb, claimId: string) => {
  const claim = db.claims.find((entry) => entry._id === claimId);
  if (!claim) return;
  const votes = db.votes.filter((vote) => vote.claimId === claimId);
  const upvotes = votes.filter((vote) => vote.direction === 'up').length;
  const downvotes = votes.filter((vote) => vote.direction === 'down').length;
  claim.voteStats = buildVoteStats(upvotes, downvotes);
  claim.trendingScore = claim.voteStats.totalVotes * 4 + claim.viewCount;
  claim.updatedAt = nowIso();
};

const createNotification = (db: DemoDb, recipientId: string, notification: Omit<DemoNotificationRecord, '_id' | 'recipientId' | 'createdAt' | 'isRead'>) => {
  db.notifications.unshift({
    _id: makeId('notif'),
    recipientId,
    isRead: false,
    createdAt: nowIso(),
    ...notification,
  });
};

const parseFormData = async (body: FormData) => {
  const result: Record<string, string | File | null> = {};
  for (const [key, value] of body.entries()) {
    result[key] = value instanceof File ? value : String(value);
  }
  return result;
};

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

const buildDashboard = (db: DemoDb) => {
  const activeClaims = db.claims.filter((claim) => !claim.isDeleted);
  const pendingClaims = activeClaims.filter((claim) => claim.adminDecision === 'Processing');
  const factClaims = activeClaims.filter((claim) => claim.finalVerdict === 'Fact');
  const rumorClaims = activeClaims.filter((claim) => claim.finalVerdict === 'Rumor');
  const verifiedUsers = db.users.filter((user) => user.role === 'verified');
  const bannedUsers = db.users.filter((user) => user.isBanned);
  const trustDistribution = [
    { _id: 0, count: db.users.filter((user) => user.trustScore.current < 20).length },
    { _id: 20, count: db.users.filter((user) => user.trustScore.current >= 20 && user.trustScore.current < 40).length },
    { _id: 40, count: db.users.filter((user) => user.trustScore.current >= 40 && user.trustScore.current < 60).length },
    { _id: 60, count: db.users.filter((user) => user.trustScore.current >= 60 && user.trustScore.current < 75).length },
    { _id: 75, count: db.users.filter((user) => user.trustScore.current >= 75 && user.trustScore.current < 90).length },
    { _id: 90, count: db.users.filter((user) => user.trustScore.current >= 90).length },
  ];

  return {
    totalUsers: db.users.length,
    totalClaims: activeClaims.length,
    pendingClaims: pendingClaims.length,
    totalVotes: db.votes.length,
    verifiedUsers: verifiedUsers.length,
    bannedUsers: bannedUsers.length,
    factClaims: factClaims.length,
    rumorClaims: rumorClaims.length,
    newUsersThisWeek: db.users.length,
    trustDistribution,
  };
};

async function handleGet(path: string, config?: RequestConfig) {
  const db = ensureDb();
  const viewerId = getCurrentUserId();

  if (path === '/auth/me') {
    const user = requireAuth(db);
    return ok({ data: stripPassword(user) });
  }

  if (path === '/claims') {
    const params = config?.params ?? {};
    let claims = db.claims.filter((claim) => !claim.isDeleted);
    if (params.category) claims = claims.filter((claim) => claim.category === params.category);
    if (params.verdict) claims = claims.filter((claim) => claim.finalVerdict === params.verdict);
    claims = sortClaims(claims, params.sort);
    const data = claims.map((claim) => decorateClaim(db, claim, viewerId));
    return ok({ data, meta: { hasMore: false } });
  }

  if (path.startsWith('/claims/trending/')) {
    const verdict = path.endsWith('/facts') ? 'Fact' : 'Rumor';
    const data = db.claims
      .filter((claim) => !claim.isDeleted && claim.finalVerdict === verdict)
      .sort((a, b) => b.trendingScore - a.trendingScore)
      .slice(0, 10)
      .map((claim) => decorateClaim(db, claim, viewerId));
    return ok({ data });
  }

  if (path === '/claims/search') {
    const query = (config?.params?.q ?? '').toLowerCase().trim();
    const data = db.claims
      .filter((claim) => !claim.isDeleted)
      .filter((claim) => `${claim.title} ${claim.body ?? ''} ${claim.category}`.toLowerCase().includes(query))
      .map((claim) => decorateClaim(db, claim, viewerId));
    return ok({ data, meta: { hasMore: false } });
  }

  if (/^\/claims\/[^/]+$/.test(path)) {
    const id = path.split('/')[2];
    const claim = db.claims.find((entry) => entry._id === id && !entry.isDeleted);
    if (!claim) return fail('Claim not found', 404, 'NOT_FOUND');
    claim.viewCount += 1;
    claim.trendingScore += 1;
    saveDb(db);
    return ok({ data: decorateClaim(db, claim, viewerId) });
  }

  if (/^\/users\/[^/]+$/.test(path) && !path.includes('/followers') && !path.includes('/following') && !path.includes('/posts')) {
    const username = path.split('/')[2];
    const user = db.users.find((entry) => entry.username === username);
    if (!user) return fail('User not found', 404, 'NOT_FOUND');
    return ok({ data: toPublicUser(user, viewerId) });
  }

  if (/^\/users\/[^/]+\/posts$/.test(path)) {
    const username = path.split('/')[2];
    const user = db.users.find((entry) => entry.username === username);
    if (!user) return fail('User not found', 404, 'NOT_FOUND');
    const data = db.claims
      .filter((claim) => !claim.isDeleted && claim.authorId === user._id)
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
      .map((claim) => decorateClaim(db, claim, viewerId));
    return ok({ data, meta: { hasMore: false } });
  }

  if (path === '/users/me/posts') {
    const me = requireAuth(db);
    const data = db.claims
      .filter((claim) => !claim.isDeleted && claim.authorId === me._id)
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
      .map((claim) => decorateClaim(db, claim, me._id));
    return ok({ data, meta: { hasMore: false } });
  }

  if (path === '/users/me/stats') {
    const me = requireAuth(db);
    return ok({ data: deepClone(me.stats) });
  }

  if (/^\/users\/[^/]+\/followers$/.test(path)) {
    const username = path.split('/')[2];
    const user = db.users.find((entry) => entry.username === username);
    if (!user) return fail('User not found', 404, 'NOT_FOUND');
    const data = user.followerIds
      .map((id) => db.users.find((entry) => entry._id === id))
      .filter(Boolean)
      .map((entry) => toPublicUser(entry as DemoUserRecord, viewerId));
    return ok({ data });
  }

  if (/^\/users\/[^/]+\/following$/.test(path)) {
    const username = path.split('/')[2];
    const user = db.users.find((entry) => entry.username === username);
    if (!user) return fail('User not found', 404, 'NOT_FOUND');
    const data = user.followingIds
      .map((id) => db.users.find((entry) => entry._id === id))
      .filter(Boolean)
      .map((entry) => toPublicUser(entry as DemoUserRecord, viewerId));
    return ok({ data });
  }

  if (path === '/messages') {
    const me = requireAuth(db);
    const relevant = db.messages
      .filter((message) => message.fromId === me._id || message.toId === me._id)
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

    const seen = new Set<string>();
    const data: IConversation[] = [];

    for (const message of relevant) {
      const partnerId = message.fromId === me._id ? message.toId : message.fromId;
      if (seen.has(partnerId)) continue;
      seen.add(partnerId);
      const partner = db.users.find((user) => user._id === partnerId)!;
      const unreadCount = db.messages.filter((entry) => entry.fromId === partnerId && entry.toId === me._id && !entry.isRead).length;
      data.push({
        partner: toPublicUser(partner, me._id),
        lastMessage: decorateMessage(db, message),
        unreadCount,
      });
    }

    return ok({ data });
  }

  if (/^\/messages\/[^/]+$/.test(path)) {
    const me = requireAuth(db);
    const partnerId = path.split('/')[2];
    const partner = db.users.find((user) => user._id === partnerId);
    if (!partner) return fail('User not found', 404, 'NOT_FOUND');
    const data = db.messages
      .filter((message) => (message.fromId === me._id && message.toId === partnerId) || (message.fromId === partnerId && message.toId === me._id))
      .sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt))
      .map((message) => decorateMessage(db, message));
    return ok({ data });
  }

  if (path === '/notifications') {
    const me = requireAuth(db);
    const data = db.notifications
      .filter((notification) => notification.recipientId === me._id)
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
      .map(({ recipientId: _recipientId, ...notification }) => notification);
    return ok({ data });
  }

  if (path === '/admin/dashboard') {
    const me = requireAuth(db);
    if (me.role !== 'admin') return fail('Insufficient permissions', 403, 'FORBIDDEN');
    return ok({ data: buildDashboard(db) });
  }

  if (path === '/admin/claims/queue') {
    const me = requireAuth(db);
    if (me.role !== 'admin') return fail('Insufficient permissions', 403, 'FORBIDDEN');
    const claims = db.claims
      .filter((claim) => !claim.isDeleted && claim.adminDecision === 'Processing')
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
      .map((claim) => decorateClaim(db, claim, me._id));
    return ok({ data: claims, meta: { total: claims.length } });
  }

  if (path === '/admin/users') {
    const me = requireAuth(db);
    if (me.role !== 'admin') return fail('Insufficient permissions', 403, 'FORBIDDEN');
    const search = (config?.params?.search ?? '').toLowerCase();
    const users = db.users
      .filter((user) => !search || `${user.displayName} ${user.username} ${user.email}`.toLowerCase().includes(search))
      .map((user) => toPublicUser(user, me._id));
    return ok({ data: users, meta: { total: users.length } });
  }

  if (path === '/admin/claims/verification-candidates') {
    const me = requireAuth(db);
    if (me.role !== 'admin') return fail('Insufficient permissions', 403, 'FORBIDDEN');
    const data = db.users
      .filter((user) => user.role === 'user' && user.trustScore.current >= 75)
      .map((user) => toPublicUser(user, me._id));
    return ok({ data });
  }

  if (path === '/admin/system/health') {
    const me = requireAuth(db);
    if (me.role !== 'admin') return fail('Insufficient permissions', 403, 'FORBIDDEN');
    return ok({
      status: 'ok',
      uptime: 24 * 3600,
      services: {
        database: 'demo-storage',
        redis: 'disabled',
        mlService: 'local-demo',
      },
    });
  }

  return fail(`No demo route for GET ${path}`, 404, 'NOT_FOUND');
}

async function handlePost(path: string, body?: any) {
  const db = ensureDb();

  if (path === '/auth/register') {
    const email = String(body.email).toLowerCase();
    if (db.users.some((user) => user.email.toLowerCase() === email)) {
      return fail('email already exists', 409, 'DUPLICATE_KEY');
    }
    if (db.users.some((user) => user.username === body.username)) {
      return fail('username already exists', 409, 'DUPLICATE_KEY');
    }

    const createdAt = nowIso();
    const newUser: DemoUserRecord = {
      _id: makeId('user'),
      email,
      username: String(body.username).toLowerCase(),
      displayName: String(body.displayName),
      bio: '',
      avatarUrl: '',
      role: email === ADMIN_EMAIL ? 'admin' : 'user',
      isEmailVerified: true,
      isBanned: false,
      trustScore: baseTrustScore(email === ADMIN_EMAIL ? 95 : 50),
      stats: { totalClaims: 0, factsPosted: 0, rumorsPosted: 0 },
      createdAt,
      updatedAt: createdAt,
      password: String(body.password),
      followingIds: [],
      followerIds: [],
    };
    db.users.push(newUser);
    saveDb(db);
    return ok({ data: { user: stripPassword(newUser), accessToken: `demo-token-${newUser._id}` } });
  }

  if (path === '/auth/login') {
    const email = String(body.email).toLowerCase();
    const user = db.users.find((entry) => entry.email.toLowerCase() === email && entry.password === body.password);
    if (!user) return fail('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    return ok({ data: { user: stripPassword(user), accessToken: `demo-token-${user._id}` } });
  }

  if (path === '/auth/logout') {
    localStorage.removeItem('accessToken');
    return ok({ message: 'Logged out' });
  }

  if (path === '/auth/forgot-password') {
    return ok({ message: 'If that email exists, a reset link has been sent.' });
  }

  if (path === '/auth/reset-password') {
    return ok({ message: 'Password reset successfully. Please log in.' });
  }

  if (path === '/claims') {
    const me = requireAuth(db);
    const parsed = body instanceof FormData ? await parseFormData(body) : body;
    const title = String(parsed.title ?? '').trim();
    if (title.length < 10) return fail('Minimum 10 characters', 400, 'VALIDATION_ERROR');
    const category = (parsed.category as ClaimCategory) || 'other';
    const bodyText = String(parsed.body ?? '').trim();
    let media: IClaim['media'] = { type: 'none' };

    const mediaFile = parsed.media;
    if (mediaFile instanceof File && mediaFile.size > 0) {
      const url = await fileToDataUrl(mediaFile);
      media = {
        type: mediaFile.type.startsWith('video/') ? 'video' : 'image',
        url,
        thumbnailUrl: url,
      };
    }

    const createdAt = nowIso();
    const mlPrediction = getMlPrediction(`${title} ${bodyText}`);
    const claim: DemoClaimRecord = {
      _id: makeId('claim'),
      authorId: me._id,
      title,
      body: bodyText || undefined,
      category,
      media,
      voteStats: buildVoteStats(0, 0),
      mlPrediction,
      adminDecision: 'Processing',
      finalVerdict: 'Pending',
      trendingScore: 0,
      viewCount: 0,
      isDeleted: false,
      createdAt,
      updatedAt: createdAt,
    };
    db.claims.unshift(claim);
    me.stats.totalClaims += 1;
    saveDb(db);
    return ok({ data: decorateClaim(db, claim, me._id), message: 'Claim submitted.' });
  }

  if (/^\/claims\/[^/]+\/vote$/.test(path)) {
    const me = requireAuth(db);
    const claimId = path.split('/')[2];
    const claim = db.claims.find((entry) => entry._id === claimId && !entry.isDeleted);
    if (!claim) return fail('Claim not found', 404, 'NOT_FOUND');
    if (claim.authorId === me._id) return fail('You cannot vote on your own claim', 400, 'SELF_VOTE_BLOCKED');

    const direction = body.direction as VoteDirection;
    const existing = db.votes.find((vote) => vote.claimId === claimId && vote.userId === me._id);
    if (existing) existing.direction = direction;
    else db.votes.push({ claimId, userId: me._id, direction });
    me.trustScore.totalVotesCast += existing ? 0 : 1;
    refreshClaimVoteStats(db, claimId);
    saveDb(db);
    return ok({ data: decorateClaim(db, claim, me._id) });
  }

  if (/^\/users\/[^/]+\/follow$/.test(path)) {
    const me = requireAuth(db);
    const targetId = path.split('/')[2];
    if (targetId === me._id) return fail('You cannot follow yourself', 400, 'SELF_FOLLOW_BLOCKED');
    const target = db.users.find((user) => user._id === targetId);
    if (!target) return fail('User not found', 404, 'NOT_FOUND');
    if (!me.followingIds.includes(targetId)) me.followingIds.push(targetId);
    if (!target.followerIds.includes(me._id)) target.followerIds.push(me._id);
    createNotification(db, targetId, {
      type: 'new_follower',
      title: 'New follower',
      message: `${me.displayName} started following you.`,
      link: `/profile/${me.username}`,
    });
    saveDb(db);
    return ok({ data: toPublicUser(target, me._id) });
  }

  if (path === '/messages') {
    const me = requireAuth(db);
    const recipientId = String(body.to);
    const recipient = db.users.find((user) => user._id === recipientId);
    if (!recipient) return fail('User not found', 404, 'NOT_FOUND');
    if (recipientId === me._id) return fail('You cannot message yourself', 400, 'SELF_MESSAGE_BLOCKED');
    const message: DemoMessageRecord = {
      _id: makeId('msg'),
      fromId: me._id,
      toId: recipientId,
      content: String(body.content).trim(),
      isRead: false,
      createdAt: nowIso(),
    };
    db.messages.push(message);
    createNotification(db, recipientId, {
      type: 'new_message',
      title: 'New message',
      message: `${me.displayName} sent you a message.`,
      link: `/messages?to=${me._id}`,
    });
    saveDb(db);
    return ok({ data: decorateMessage(db, message) });
  }

  return fail(`No demo route for POST ${path}`, 404, 'NOT_FOUND');
}

async function handlePut(path: string, body?: any) {
  const db = ensureDb();
  const me = requireAuth(db);

  if (path === '/users/me') {
    const username = String(body.username).toLowerCase();
    const usernameOwner = db.users.find((user) => user.username === username && user._id !== me._id);
    if (usernameOwner) return fail('username already exists', 409, 'DUPLICATE_KEY');
    me.displayName = String(body.displayName);
    me.username = username;
    me.bio = String(body.bio ?? '');
    me.updatedAt = nowIso();
    saveDb(db);
    return ok({ data: stripPassword(me) });
  }

  return fail(`No demo route for PUT ${path}`, 404, 'NOT_FOUND');
}

async function handlePatch(path: string, body?: any) {
  const db = ensureDb();
  const me = requireAuth(db);

  if (path === '/notifications/read-all') {
    db.notifications.forEach((notification) => {
      if (notification.recipientId === me._id) notification.isRead = true;
    });
    saveDb(db);
    return ok({ message: 'All notifications marked as read' });
  }

  if (/^\/notifications\/[^/]+\/read$/.test(path)) {
    const id = path.split('/')[2];
    const notification = db.notifications.find((entry) => entry._id === id && entry.recipientId === me._id);
    if (!notification) return fail('Notification not found', 404, 'NOT_FOUND');
    notification.isRead = true;
    saveDb(db);
    return ok({ message: 'Notification marked as read' });
  }

  if (/^\/messages\/[^/]+\/read$/.test(path)) {
    const partnerId = path.split('/')[2];
    db.messages.forEach((message) => {
      if (message.fromId === partnerId && message.toId === me._id) message.isRead = true;
    });
    saveDb(db);
    return ok({ message: 'Conversation marked as read' });
  }

  if (/^\/admin\/claims\/[^/]+\/verdict$/.test(path)) {
    if (me.role !== 'admin') return fail('Insufficient permissions', 403, 'FORBIDDEN');
    const claimId = path.split('/')[3];
    const claim = db.claims.find((entry) => entry._id === claimId);
    if (!claim) return fail('Claim not found', 404, 'NOT_FOUND');
    const decision = body.decision as Exclude<FinalVerdict, 'Pending'>;
    claim.adminDecision = decision as AdminDecision;
    claim.finalVerdict = decision;
    claim.adminDecidedById = me._id;
    claim.adminDecidedAt = nowIso();
    claim.adminNote = body.adminNote ?? claim.adminNote ?? '';
    claim.updatedAt = nowIso();
    const author = db.users.find((user) => user._id === claim.authorId);
    if (author) {
      if (decision === 'Fact') author.stats.factsPosted += 1;
      if (decision === 'Rumor') author.stats.rumorsPosted += 1;
      createNotification(db, author._id, {
        type: 'verdict_set',
        title: 'Your claim has been reviewed',
        message: `Your claim "${claim.title}" was marked as ${decision}.`,
        link: `/claims/${claim._id}`,
      });
    }
    saveDb(db);
    return ok({ data: decorateClaim(db, claim, me._id), message: `Claim marked as ${decision}` });
  }

  if (/^\/admin\/users\/[^/]+\/verify$/.test(path)) {
    if (me.role !== 'admin') return fail('Insufficient permissions', 403, 'FORBIDDEN');
    const userId = path.split('/')[3];
    const user = db.users.find((entry) => entry._id === userId);
    if (!user) return fail('User not found', 404, 'NOT_FOUND');
    user.role = 'verified';
    user.verifiedAt = nowIso();
    createNotification(db, userId, {
      type: 'verified_granted',
      title: 'You are now verified',
      message: 'Your demo account has been promoted to verified status.',
      link: `/profile/${user.username}`,
    });
    saveDb(db);
    return ok({ data: stripPassword(user) });
  }

  if (/^\/admin\/users\/[^/]+\/ban$/.test(path)) {
    if (me.role !== 'admin') return fail('Insufficient permissions', 403, 'FORBIDDEN');
    const userId = path.split('/')[3];
    const user = db.users.find((entry) => entry._id === userId);
    if (!user) return fail('User not found', 404, 'NOT_FOUND');
    if (user.role === 'admin') return fail('Cannot ban an admin', 400, 'CANNOT_BAN_ADMIN');
    user.isBanned = !user.isBanned;
    saveDb(db);
    return ok({ data: stripPassword(user) });
  }

  if (path === '/users/me/avatar') {
    return fail('Use POST for avatar upload in demo mode', 405, 'METHOD_NOT_ALLOWED');
  }

  return fail(`No demo route for PATCH ${path}`, 404, 'NOT_FOUND');
}

async function handleDelete(path: string) {
  const db = ensureDb();
  const me = requireAuth(db);

  if (/^\/claims\/[^/]+$/.test(path)) {
    const claimId = path.split('/')[2];
    const claim = db.claims.find((entry) => entry._id === claimId);
    if (!claim) return fail('Claim not found', 404, 'NOT_FOUND');
    if (claim.authorId !== me._id && me.role !== 'admin') return fail('You can only delete your own claims', 403, 'FORBIDDEN');
    claim.isDeleted = true;
    saveDb(db);
    return ok({ message: 'Claim deleted' });
  }

  if (/^\/claims\/[^/]+\/vote$/.test(path)) {
    const claimId = path.split('/')[2];
    const index = db.votes.findIndex((vote) => vote.claimId === claimId && vote.userId === me._id);
    if (index >= 0) db.votes.splice(index, 1);
    refreshClaimVoteStats(db, claimId);
    saveDb(db);
    return ok({ message: 'Vote removed' });
  }

  if (/^\/users\/[^/]+\/follow$/.test(path)) {
    const targetId = path.split('/')[2];
    const target = db.users.find((user) => user._id === targetId);
    if (!target) return fail('User not found', 404, 'NOT_FOUND');
    me.followingIds = me.followingIds.filter((id) => id !== targetId);
    target.followerIds = target.followerIds.filter((id) => id !== me._id);
    saveDb(db);
    return ok({ data: toPublicUser(target, me._id) });
  }

  return fail(`No demo route for DELETE ${path}`, 404, 'NOT_FOUND');
}

async function handleAvatarUpload(body: FormData) {
  const db = ensureDb();
  const me = requireAuth(db);
  const parsed = await parseFormData(body);
  const avatar = parsed.avatar;
  if (!(avatar instanceof File)) return fail('No file uploaded', 400, 'NO_FILE');
  me.avatarUrl = await fileToDataUrl(avatar);
  me.updatedAt = nowIso();
  saveDb(db);
  return ok({ data: { avatarUrl: me.avatarUrl } });
}

const client = {
  async get(path: string, config?: RequestConfig) {
    return handleGet(path, config);
  },
  async post(path: string, body?: any, config?: RequestConfig) {
    if (path === '/users/me/avatar' && body instanceof FormData) {
      return handleAvatarUpload(body);
    }
    return handlePost(path, body ?? config);
  },
  async put(path: string, body?: any) {
    return handlePut(path, body);
  },
  async patch(path: string, body?: any) {
    return handlePatch(path, body);
  },
  async delete(path: string) {
    return handleDelete(path);
  },
};

export const demoApi = client;
export const isDemoMode = () => DEMO_MODE;
