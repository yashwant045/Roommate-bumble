import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { MessageService } from "../services/messageService";
import { BadRequestError } from "../utils/errors";

const messageService = new MessageService();

export class MessageController {
  async getMessages(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new BadRequestError("User context missing");
      }

      const { matchId } = req.params;
      if (!matchId) {
        throw new BadRequestError("Match ID parameter is required");
      }

      const messages = await messageService.getMessages(matchId, userId);

      return res.status(200).json({
        success: true,
        data: messages,
      });
    } catch (error) {
      next(error);
    }
  }
}
