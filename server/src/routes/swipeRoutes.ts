import { Router } from "express";
import { SwipeController } from "../controllers/swipeController";
import { authMiddleware } from "../middlewares/authMiddleware";

const router = Router();
const swipeController = new SwipeController();

router.post("/", authMiddleware, swipeController.swipe);
router.get("/matches", authMiddleware, swipeController.getMatches);

export default router;
