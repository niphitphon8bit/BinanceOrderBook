import { Router } from "express";
import * as binanceController from "../controllers/binance.controller";

const router = Router();

router.get("/init/:symbol", binanceController.getDepthSnapshot);
router.get("/local", binanceController.getLocalOrderBook);

export default router;
