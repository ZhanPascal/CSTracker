import { Router } from 'express';
import messageRoutes from './message.routes';
import riotRoutes from './riot.routes';

const router = Router();

router.use('/message', messageRoutes);
router.use('/lol', riotRoutes);

export default router;
