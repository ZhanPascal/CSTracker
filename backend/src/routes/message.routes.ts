import { Router } from 'express';
import { getMessageHandler } from '../controllers/message.controller';

const router = Router();

// GET /api/message
router.get('/', getMessageHandler);

export default router;
