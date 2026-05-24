import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { SwipeService } from "../services/swipeService";
import { z } from "zod";
import { BadRequestError } from "../utils/errors";

const swipeService = new SwipeService();

const swipeSchema = z.object({
  swipeeId: z.string().uuid("Invalid swipee ID format"),
  liked: z.boolean(),
});

export class SwipeController {
  async swipe(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const swiperId = req.user?.userId;
      if (!swiperId) {
        throw new BadRequestError("User context missing");
      }

      const parsed = swipeSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new BadRequestError(parsed.error.errors[0].message);
      }

      const { swipeeId, liked } = parsed.data;
      if (swiperId === swipeeId) {
        throw new BadRequestError("You cannot swipe on yourself");
      }

      const result = await swipeService.swipe(swiperId, swipeeId, liked);

      return res.status(200).json({
        success: true,
        message: result.matchCreated ? "It's a Match! 🎉" : "Swipe recorded successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getMatches(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new BadRequestError("User context missing");
      }

      const matches = await swipeService.getMatches(userId);

      return res.status(200).json({
        success: true,
        data: matches,
      });
    } catch (error) {
      next(error);
    }
  }
}
