import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { config } from './env';
import { logger } from '../shared/utils/logger';

let memoryServer: MongoMemoryServer | null = null;

export const connectDatabase = async (): Promise<void> => {
  try {
    mongoose.set('strictQuery', true);

    if (config.useInMemoryServices) {
      memoryServer = await MongoMemoryServer.create();
      await mongoose.connect(memoryServer.getUri(), {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });
      logger.info('MongoDB memory server started for local development');
    } else {
      await mongoose.connect(config.mongodb.uri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });
    }

    logger.info('✅ MongoDB connected successfully');

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected. Attempting to reconnect...');
    });

  } catch (error) {
    logger.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
  logger.info('MongoDB disconnected');
};
