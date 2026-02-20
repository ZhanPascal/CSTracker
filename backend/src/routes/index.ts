import { Router } from 'express';
import messageRoutes from './message.routes';

const router = Router();

router.use('/message', messageRoutes);

export default router;
