import { Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { AuthRequest, UserRole } from '../types';
import { User } from '../../modules/users/user.model';

const hydrateAuthUser = async (id: string, fallbackRole: UserRole, fallbackEmail: string) => {
  const dbUser = await User.findById(id).select('role email').lean();
  return {
    id,
    role: (dbUser?.role ?? fallbackRole) as UserRole,
    email: dbUser?.email ?? fallbackEmail,
  };
};

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({
        error: { code: 'MISSING_TOKEN', message: 'Access token is required' },
      });
      return;
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token);
    req.user = await hydrateAuthUser(payload.id, payload.role as UserRole, payload.email);
    next();
  } catch {
    res.status(401).json({
      error: { code: 'INVALID_TOKEN', message: 'Access token is invalid or expired' },
    });
  }
};

export const optionalAuthenticate = async (req: AuthRequest, _res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const payload = verifyAccessToken(token);
      req.user = await hydrateAuthUser(payload.id, payload.role as UserRole, payload.email);
    }
  } catch {
    // Ignore auth errors for optional authentication
  }
  next();
};

export const authorize = (...roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: { code: 'UNAUTHENTICATED', message: 'Authentication required' },
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Insufficient permissions' },
      });
      return;
    }

    next();
  };
};
