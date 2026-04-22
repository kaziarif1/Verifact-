import app from '../src/app';
import { connectDatabase } from '../src/config/database';
import { connectRedis } from '../src/config/redis';

let startupPromise: Promise<void> | null = null;

const ensureStarted = async () => {
  if (!startupPromise) {
    startupPromise = (async () => {
      await connectDatabase();
      await connectRedis();
    })();
  }

  await startupPromise;
};

export default async function handler(req: any, res: any) {
  await ensureStarted();
  return app(req, res);
}
