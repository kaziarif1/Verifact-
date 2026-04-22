import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '../../config/env';

export interface AccessTokenPayload {
  id: string;
  role: string;
  email: string;
}

export interface RefreshTokenPayload {
  id: string;
  version: number;
}

export const signAccessToken = (payload: AccessTokenPayload): string => {
  return jwt.sign(payload, config.jwt.privateKey, {
    algorithm: 'RS256',
    expiresIn: config.jwt.accessExpiresIn,
  } as SignOptions);
};

export const signRefreshToken = (payload: RefreshTokenPayload): string => {
  return jwt.sign(payload, config.jwt.privateKey, {
    algorithm: 'RS256',
    expiresIn: config.jwt.refreshExpiresIn,
  } as SignOptions);
};

export const verifyAccessToken = (token: string): AccessTokenPayload => {
  return jwt.verify(token, config.jwt.publicKey, {
    algorithms: ['RS256'],
  }) as AccessTokenPayload;
};

export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
  return jwt.verify(token, config.jwt.publicKey, {
    algorithms: ['RS256'],
  }) as RefreshTokenPayload;
};

export const decodeToken = (token: string) => jwt.decode(token);
