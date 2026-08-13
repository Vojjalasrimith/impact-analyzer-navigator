import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDatabase } from './src/config/db.js';
import entityRouter from './src/routes/entityRoutes.js';
import relationshipRouter from './src/routes/relationshipRoutes.js';
import graphRouter from './src/routes/graphRoutes.js';
import impactRouter from './src/routes/impactRoutes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load env variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/dep_navigator';

// Middleware
app.use(cors());
app.use(express.json());

// Database connection state
let dbStatus = 'Disconnected';

import { seedDatabase } from './src/utils/seeder.js';
import { ProjectModel } from './src/models/index.js';
import { cognoService } from './src/services/cognoService.js';

// Connect to MongoDB
connectDatabase(MONGODB_URI)
  .then(async () => {
    dbStatus = 'Connected';

    // Initialize CognoDB connection
    const cognoUrl = process.env.COGNO_API_URL || '';
    const cognoUser = process.env.COGNO_USER || 'cognodb';
    const cognoPass = process.env.COGNO_PASSWORD || '';
    await cognoService.connect(cognoUrl, cognoPass, cognoUser);

    // Automatically seed database if empty
    const count = await ProjectModel.countDocuments();
    if (count === 0) {
      console.log('Database is empty. Running auto-seeding...');
      try {
        await seedDatabase();
      } catch (err) {
        console.error('Failed to run auto-seeding:', err);
      }
    }
  })
  .catch((err) => {
    dbStatus = `Error: ${err.message}`;
  });

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: dbStatus,
    uptime: process.uptime()
  });
});

// Entity endpoints
app.use('/api/entities', entityRouter);

// Relationship endpoints
app.use('/api/relationships', relationshipRouter);

// Graph endpoint
app.use('/api/graph', graphRouter);

// Impact analysis endpoint
app.use('/api/impact-analysis', impactRouter);

// Serve the built frontend as static assets in production, with SPA fallback
if (process.env.NODE_ENV === 'production') {
  const frontendDist = path.resolve(__dirname, '../frontend/dist');
  app.use(express.static(frontendDist));
  app.get(/^(?!\/api).*/, (_req: Request, res: Response) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// Centralized error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: err.message || 'Internal Server Error'
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
