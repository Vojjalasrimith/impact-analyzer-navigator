import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDatabase } from './src/config/db.js';
import ApiRouter from "./src/routes/routes.js"
import { createLogger } from './src/utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const getLogger = createLogger('Server');

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
const bootstrapLog = getLogger('bootstrap');

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
      bootstrapLog.info('Database is empty. Running auto-seeding...');
      try {
        await seedDatabase();
      } catch (err: any) {
        bootstrapLog.error('Failed to run auto-seeding', { error: err.message });
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

app.use('/api', ApiRouter);

// Serve the built frontend as static assets in production, with SPA fallback
if (process.env.NODE_ENV === 'production') {
  const frontendDist = path.resolve(__dirname, '../../frontend/dist');
  app.use(express.static(frontendDist));
  app.get(/^(?!\/api).*/, (_req: Request, res: Response) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// Centralized error handling middleware
const errorLog = getLogger('errorHandler');
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  errorLog.error('Unhandled server error', { path: req.path, method: req.method, error: err.message });
  res.status(500).json({
    error: err.message || 'Internal Server Error'
  });
});

// Start Server
const startupLog = getLogger('startup');
app.listen(PORT, () => {
  startupLog.info(`Server running on port ${PORT}`);
});
