import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { User } from '../users/user.model';
import { getRedisClient } from '../../config/redis';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../shared/utils/jwt';
import { emailQueue } from '../../queues';
import { buildVerifyEmailHtml, buildPasswordResetHtml } from '../../shared/utils/email';
import { AppError, badRequest, notFound, unauthorized } from '../../shared/middleware/errorHandler';
import { config } from '../../config/env';
import { logger } from '../../shared/utils/logger';

const REFRESH_TOKEN_PREFIX = 'refresh:';
const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60; // 7 days in seconds

const storeRefreshToken = async (userId: string, token: string): Promise<void> => {
  const redis = getRedisClient();
  await redis.set(`${REFRESH_TOKEN_PREFIX}${userId}`, token, 'EX', REFRESH_TOKEN_TTL);
};

const deleteRefreshToken = async (userId: string): Promise<void> => {
  const redis = getRedisClient();
  await redis.del(`${REFRESH_TOKEN_PREFIX}${userId}`);
};

const isConfiguredLocalAdmin = (email: string, password?: string): boolean => (
  config.useInMemoryServices
  && email.toLowerCase() === config.localAdmin.email.toLowerCase()
  && (password === undefined || password === config.localAdmin.password)
);

const syncLocalAdminRoles = async (): Promise<void> => {
  if (!config.useInMemoryServices) return;

  await User.updateMany(
    { email: { $ne: config.localAdmin.email.toLowerCase() }, role: 'admin' },
    { $set: { role: 'user' } }
  );
};

const ensureLocalAdminUser = async (email: string, password: string): Promise<any> => {
  if (!isConfiguredLocalAdmin(email, password)) return null;

  let user = await User.findOne({ email }).select('+passwordHash');
  if (!user) {
    user = await User.create({
      email: email.toLowerCase(),
      username: 'kazarif02',
      displayName: 'Kazi Arif',
      passwordHash: await bcrypt.hash(password, 12),
      role: 'admin',
      isEmailVerified: true,
    });
    user = await User.findById(user.id).select('+passwordHash');
  } else if (user.role !== 'admin' || !user.isEmailVerified) {
    user.role = 'admin';
    user.isEmailVerified = true;
    await user.save();
  }

  await syncLocalAdminRoles();
  return user;
};

export const register = async (data: {
  email: string;
  username: string;
  displayName: string;
  password: string;
}) => {
  const { email, username, displayName, password } = data;

  const [existingEmail, existingUsername] = await Promise.all([
    User.findOne({ email }),
    User.findOne({ username }),
  ]);

  if (existingEmail) throw new AppError('Email already in use', 409, 'EMAIL_EXISTS');
  if (existingUsername) throw new AppError('Username already taken', 409, 'USERNAME_EXISTS');

  if (config.useInMemoryServices && email.toLowerCase() === config.localAdmin.email.toLowerCase() && password !== config.localAdmin.password) {
    throw badRequest('This email is reserved for the local admin account', 'ADMIN_EMAIL_RESERVED');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const emailVerifyToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(emailVerifyToken).digest('hex');
  const isLocalAdmin = isConfiguredLocalAdmin(email, password);

  const user = await User.create({
    email,
    username,
    displayName,
    passwordHash,
    emailVerifyToken: hashedToken,
    role: isLocalAdmin ? 'admin' : 'user',
    isEmailVerified: config.useInMemoryServices,
  });

  // Account creation should not fail just because background email delivery is unavailable.
  try {
    await emailQueue.add('verify_email', {
      type: 'verify_email',
      to: user.email,
      subject: 'Verify your Verifact account',
      html: buildVerifyEmailHtml(user.displayName, emailVerifyToken),
    });
  } catch (error) {
    logger.error('Failed to enqueue verification email:', error);
  }

  if (isLocalAdmin) {
    await syncLocalAdminRoles();
  }

  const accessToken = signAccessToken({ id: user.id, role: user.role, email: user.email });
  const refreshToken = signRefreshToken({ id: user.id, version: 1 });
  let persistedRefreshToken: string | null = refreshToken;

  try {
    await storeRefreshToken(user.id, refreshToken);
  } catch (error) {
    persistedRefreshToken = null;
    logger.error('Failed to persist refresh token during registration:', error);
  }

  return { user, accessToken, refreshToken: persistedRefreshToken };
};

export const login = async (email: string, password: string) => {
  let user = await User.findOne({ email }).select('+passwordHash');
  if (!user) {
    user = await ensureLocalAdminUser(email, password);
    if (!user) throw unauthorized('Invalid email or password');
  }

  if (user.isBanned) throw new AppError('Your account has been suspended', 403, 'ACCOUNT_BANNED');

  const isMatch = await user.comparePassword(password);
  if (!isMatch) throw unauthorized('Invalid email or password');

  if (config.useInMemoryServices) {
    if (isConfiguredLocalAdmin(user.email, password)) {
      if (user.role !== 'admin' || !user.isEmailVerified) {
        user.role = 'admin';
        user.isEmailVerified = true;
        await user.save();
      }
      await syncLocalAdminRoles();
    } else if (user.role === 'admin') {
      user.role = 'user';
      await user.save();
    }
  }

  const accessToken = signAccessToken({ id: user.id, role: user.role, email: user.email });
  const refreshToken = signRefreshToken({ id: user.id, version: 1 });
  let persistedRefreshToken: string | null = refreshToken;

  try {
    await storeRefreshToken(user.id, refreshToken);
  } catch (error) {
    persistedRefreshToken = null;
    logger.error('Failed to persist refresh token during login:', error);
  }

  return { user, accessToken, refreshToken: persistedRefreshToken };
};

export const refreshTokens = async (refreshToken: string) => {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw unauthorized('Refresh token is invalid or expired');
  }

  const redis = getRedisClient();
  const storedToken = await redis.get(`${REFRESH_TOKEN_PREFIX}${payload.id}`);
  if (!storedToken || storedToken !== refreshToken) {
    throw unauthorized('Refresh token has been revoked');
  }

  const user = await User.findById(payload.id);
  if (!user || user.isBanned) throw unauthorized('User not found or banned');

  const newAccessToken = signAccessToken({ id: user.id, role: user.role, email: user.email });
  const newRefreshToken = signRefreshToken({ id: user.id, version: 1 });
  await storeRefreshToken(user.id, newRefreshToken);

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
};

export const logout = async (userId: string): Promise<void> => {
  await deleteRefreshToken(userId);
};

export const verifyEmail = async (rawToken: string) => {
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  const user = await User.findOne({ emailVerifyToken: hashedToken }).select('+emailVerifyToken');
  if (!user) throw badRequest('Email verification token is invalid or expired', 'INVALID_VERIFY_TOKEN');

  user.isEmailVerified = true;
  user.emailVerifyToken = undefined;
  await user.save();

  return user;
};

export const forgotPassword = async (email: string): Promise<void> => {
  const user = await User.findOne({ email });
  if (!user) {
    // Don't reveal whether the email exists
    logger.info(`Password reset requested for non-existent email: ${email}`);
    return;
  }

  const rawToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

  user.passwordResetToken = hashedToken;
  user.passwordResetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  await user.save();

  await emailQueue.add('reset_password', {
    type: 'reset_password',
    to: user.email,
    subject: 'Reset your Verifact password',
    html: buildPasswordResetHtml(user.displayName, rawToken),
  });
};

export const resetPassword = async (rawToken: string, newPassword: string) => {
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpiry: { $gt: new Date() },
  }).select('+passwordResetToken +passwordResetExpiry');

  if (!user) throw badRequest('Password reset token is invalid or expired', 'INVALID_RESET_TOKEN');

  user.passwordHash = await bcrypt.hash(newPassword, 12);
  user.passwordResetToken = undefined;
  user.passwordResetExpiry = undefined;
  await user.save();

  // Invalidate all sessions
  await deleteRefreshToken(user.id);

  return user;
};
