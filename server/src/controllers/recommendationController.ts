import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { RecommendationService } from "../services/recommendationService";
import { BadRequestError } from "../utils/errors";

const recommendationService = new RecommendationService();

export class RecommendationController {
  async getRecommendations(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new BadRequestError("User context missing");
      }

      const matches = await recommendationService.getRecommendations(userId);

      return res.status(200).json({
        success: true,
        data: matches,
      });
    } catch (error) {
      next(error);
    }
  }
}
