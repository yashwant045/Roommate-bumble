import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import path from "path";

const isCloudinaryConfigured = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  console.log("[UploadService]: Cloudinary configured successfully.");
} else {
  console.log("[UploadService]: Cloudinary credentials not found. Defaulting to Local Disk Storage.");
}

export class UploadService {
  async uploadImage(file: Express.Multer.File, serverUrl: string): Promise<string> {
    if (isCloudinaryConfigured) {
      return this.uploadToCloudinary(file);
    } else {
      return this.uploadToLocal(file, serverUrl);
    }
  }

  private async uploadToCloudinary(file: Express.Multer.File): Promise<string> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "roommate-bumble",
          resource_type: "image",
        },
        (error, result) => {
          if (error) {
            console.error("[UploadService] Cloudinary error:", error);
            return reject(new Error("Cloudinary upload failed"));
          }
          resolve(result!.secure_url);
        }
      );
      uploadStream.end(file.buffer);
    });
  }

  private async uploadToLocal(file: Express.Multer.File, serverUrl: string): Promise<string> {
    // Create local uploads folder if it doesn't exist
    const uploadsDir = path.join(__dirname, "../../../uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Generate a unique filename using timestamp and random number
    const ext = path.extname(file.originalname) || ".jpg";
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    const filePath = path.join(uploadsDir, filename);

    // Save the file buffer locally
    await fs.promises.writeFile(filePath, file.buffer);

    // Construct the fully-qualified static URL
    // e.g. "http://localhost:5000/uploads/1700000000000-123456789.jpg"
    return `${serverUrl.replace(/\/$/, "")}/uploads/${filename}`;
  }
}
