import mongoose from 'mongoose';
import { ServerApiVersion } from 'mongodb';
import { createLogger } from '../utils/logger.js';

const log = createLogger('Config')('db');

export async function connectDatabase(uri: string): Promise<string> {
  try {
    await mongoose.connect(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      }
    });
    log.info('Successfully connected to MongoDB Atlas');
    return 'Connected';
  } catch (err: any) {
    log.error('MongoDB connection error', { error: err.message });
    throw err;
  }
}
