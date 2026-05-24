import { Router } from "express";
import { MessageController } from "../controllers/messageController";
import { authMiddleware } from "../middlewares/authMiddleware";

const router = Router();
const messageController = new MessageController();

router.get("/:matchId", authMiddleware, messageController.getMessages);

export default router;
