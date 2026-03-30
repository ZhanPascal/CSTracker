import { Router } from 'express';
import messageRoutes from './message.routes';
import riotRoutes from './riot.routes';
import esportRoutes from './esport.routes';

const router = Router();

router.use('/message', messageRoutes);
router.use('/lol', riotRoutes);
router.use('/esport', esportRoutes);

export default router;
