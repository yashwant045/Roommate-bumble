import { Router } from "express";
import { RecommendationController } from "../controllers/recommendationController";
import { authMiddleware } from "../middlewares/authMiddleware";

const router = Router();
const recommendationController = new RecommendationController();

router.get("/", authMiddleware, recommendationController.getRecommendations);

export default router;
