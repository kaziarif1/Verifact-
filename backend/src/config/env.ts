import Joi from 'joi';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(5000),
  FRONTEND_URL: Joi.string().default('http://localhost:5173'),
  PUBLIC_API_URL: Joi.string().uri().optional(),

  MONGODB_URI: Joi.string().required(),
  REDIS_URL: Joi.string().required(),

  JWT_PRIVATE_KEY_BASE64: Joi.string().required(),
  JWT_PUBLIC_KEY_BASE64: Joi.string().required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  CLOUDINARY_CLOUD_NAME: Joi.string().required(),
  CLOUDINARY_API_KEY: Joi.string().required(),
  CLOUDINARY_API_SECRET: Joi.string().required(),

  SMTP_HOST: Joi.string().required(),
  SMTP_PORT: Joi.number().default(587),
  SMTP_USER: Joi.string().required(),
  SMTP_PASS: Joi.string().required(),
  EMAIL_FROM: Joi.string().default('Verifact <noreply@verifact.app>'),

  ML_SERVICE_URL: Joi.string().uri().allow('').optional(),
  ML_INTERNAL_KEY: Joi.string().required(),
  USE_IN_MEMORY_SERVICES: Joi.boolean().truthy('true').truthy('1').falsy('false').falsy('0').default(false),
  USE_IN_MEMORY_DATABASE: Joi.boolean().truthy('true').truthy('1').falsy('false').falsy('0').optional(),
  USE_IN_MEMORY_REDIS: Joi.boolean().truthy('true').truthy('1').falsy('false').falsy('0').optional(),
  ML_PROVIDER: Joi.string().valid('remote', 'local').default('remote'),
  ENABLE_REALTIME: Joi.boolean().truthy('true').truthy('1').falsy('false').falsy('0').default(true),
  LOCAL_ADMIN_EMAIL: Joi.string().email().default('kazarif02@gmail.com'),
  LOCAL_ADMIN_PASSWORD: Joi.string().default('%Karif10%'),

  RATE_LIMIT_WINDOW_MS: Joi.number().default(60000),
  RATE_LIMIT_MAX: Joi.number().default(100),
}).unknown();

const { error, value: env } = envSchema.validate(process.env);

if (error) {
  throw new Error(`Environment validation error: ${error.message}`);
}

export const config = {
  env: env.NODE_ENV as string,
  port: env.PORT as number,
  frontendUrl: (env.FRONTEND_URL as string).split(',')[0].trim(),
  frontendUrls: (env.FRONTEND_URL as string).split(',').map((url) => url.trim()).filter(Boolean),
  isProduction: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',
  isServerless: Boolean(process.env.VERCEL),
  publicApiUrl: (env.PUBLIC_API_URL as string | undefined)?.trim()
    || ((env.NODE_ENV === 'production' && Boolean(process.env.VERCEL_URL))
      ? `https://${process.env.VERCEL_URL}`
      : `http://localhost:${env.PORT as number}`),

  mongodb: {
    uri: env.MONGODB_URI as string,
  },

  redis: {
    url: env.REDIS_URL as string,
  },

  jwt: {
    privateKey: Buffer.from(env.JWT_PRIVATE_KEY_BASE64 as string, 'base64').toString('utf-8'),
    publicKey: Buffer.from(env.JWT_PUBLIC_KEY_BASE64 as string, 'base64').toString('utf-8'),
    accessExpiresIn: env.JWT_ACCESS_EXPIRES_IN as string,
    refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN as string,
  },

  cloudinary: {
    cloudName: env.CLOUDINARY_CLOUD_NAME as string,
    apiKey: env.CLOUDINARY_API_KEY as string,
    apiSecret: env.CLOUDINARY_API_SECRET as string,
  },

  smtp: {
    host: env.SMTP_HOST as string,
    port: env.SMTP_PORT as number,
    user: env.SMTP_USER as string,
    pass: env.SMTP_PASS as string,
    from: env.EMAIL_FROM as string,
  },

  ml: {
    serviceUrl: env.ML_SERVICE_URL as string | undefined,
    internalKey: env.ML_INTERNAL_KEY as string,
    provider: env.ML_PROVIDER as 'remote' | 'local',
  },

  useInMemoryServices: env.USE_IN_MEMORY_SERVICES as boolean,
  useInMemoryDatabase: ((env.USE_IN_MEMORY_DATABASE as boolean | undefined) ?? (env.USE_IN_MEMORY_SERVICES as boolean)),
  useInMemoryRedis: ((env.USE_IN_MEMORY_REDIS as boolean | undefined) ?? (env.USE_IN_MEMORY_SERVICES as boolean)),
  realtimeEnabled: env.ENABLE_REALTIME as boolean,
  localAdmin: {
    email: env.LOCAL_ADMIN_EMAIL as string,
    password: env.LOCAL_ADMIN_PASSWORD as string,
  },

  rateLimit: {
    windowMs: env.RATE_LIMIT_WINDOW_MS as number,
    max: env.RATE_LIMIT_MAX as number,
  },
};
