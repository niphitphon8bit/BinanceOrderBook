import { Router } from "express";
import * as binanceController from "../controllers/binance.controller";

const router = Router();

router.get("/depth/:symbol", binanceController.getDepth);

export default router;
