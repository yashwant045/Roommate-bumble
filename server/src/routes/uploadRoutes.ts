import { Router } from "express";
import multer from "multer";
import { UploadController } from "../controllers/uploadController";
import { authMiddleware } from "../middlewares/authMiddleware";

const router = Router();
const uploadController = new UploadController();

// Configure multer in-memory storage for handling files as buffers
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Protect image upload endpoint and capture standard form multipart field "image"
router.post(
  "/image",
  authMiddleware,
  upload.single("image"),
  uploadController.uploadImage.bind(uploadController)
);

export default router;
