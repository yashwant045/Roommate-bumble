import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { UploadService } from "../services/uploadService";
import { BadRequestError } from "../utils/errors";

const uploadService = new UploadService();

export class UploadController {
  async uploadImage(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new BadRequestError("User context missing");
      }

      const file = req.file;
      if (!file) {
        throw new BadRequestError("No file uploaded");
      }

      // Validate file type (only allow common image mimetypes)
      const allowedMimeTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
      if (!allowedMimeTypes.includes(file.mimetype)) {
        throw new BadRequestError("Invalid file type. Only JPEG, PNG, GIF, and WEBP images are allowed.");
      }

      // Validate file size (max 5MB)
      const maxSizeBytes = 5 * 1024 * 1024;
      if (file.size > maxSizeBytes) {
        throw new BadRequestError("File too large. Maximum size allowed is 5MB.");
      }

      // Determine backend domain URL dynamically from request context
      const serverUrl = `${req.protocol}://${req.get("host")}`;

      const uploadedUrl = await uploadService.uploadImage(file, serverUrl);

      return res.status(200).json({
        success: true,
        message: "Image uploaded successfully",
        data: {
          url: uploadedUrl,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
