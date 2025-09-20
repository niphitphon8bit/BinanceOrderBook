import { Router } from "express";
import * as binanceController from "../controllers/binance.controller";

const router = Router();

router.get("/init/:symbol", binanceController.initOrderBook);
router.get("/state", binanceController.getOrderBookState);

export default router;
