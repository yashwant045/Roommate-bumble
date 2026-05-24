import { Router } from "express";
import { ProfileController } from "../controllers/profileController";
import { authMiddleware } from "../middlewares/authMiddleware";

const router = Router();
const profileController = new ProfileController();

router.get("/me", authMiddleware, profileController.getProfile);
router.put("/me", authMiddleware, profileController.updateProfile);

export default router;
