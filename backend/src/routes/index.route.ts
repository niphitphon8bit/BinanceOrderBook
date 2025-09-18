import { Router } from 'express';
import healthRoute from './health.routes';
import binanceRoutes from "./binance.routes";

const router = Router();

router.use('/health', healthRoute);
router.use('/binance', binanceRoutes);

export default router;
