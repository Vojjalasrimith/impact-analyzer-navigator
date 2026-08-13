import mongoose from 'mongoose';
import { ServerApiVersion } from 'mongodb';

export async function connectDatabase(uri: string): Promise<string> {
  try {
    await mongoose.connect(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      }
    });
    console.log('Successfully connected to MongoDB Atlas');
    return 'Connected';
  } catch (err: any) {
    console.error('MongoDB connection error:', err);
    throw err;
  }
}
