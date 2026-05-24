import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/errors";

export const errorMiddleware = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
    });
  }

  // Handle general runtime/DB exceptions
  console.error("[Unhandled Exception]:", err);
  return res.status(500).json({
    success: false,
    error: "Internal Server Error",
  });
};
