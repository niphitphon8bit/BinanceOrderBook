import { Request, Response, NextFunction } from "express";
import * as binanceService from "../services/binanceService";

export const getDepth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const limit = req.query.limit ? Number(req.query.limit) : 1000;

    const data = await binanceService.getOrderBook(symbol, limit);

    res.json(data);
  } catch (err) {
    next(err); // Pass error to errorHandler middleware
  }
};
