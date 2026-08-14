import { Router } from "express";
import entityRouter from "./entityRoutes.js";
import relationshipRouter from "./relationshipRoutes.js";
import graphRouter from "./graphRoutes.js";
import chatRouter from "./chatRoutes.js";

const router = Router();

// Entity endpoints
router.use('/entities', entityRouter);

// Relationship endpoints
router.use('/relationships', relationshipRouter);

// Graph endpoint
router.use('/graph', graphRouter);

// Conversational impact-analysis chat endpoint
router.use('/chat', chatRouter);

export default router;