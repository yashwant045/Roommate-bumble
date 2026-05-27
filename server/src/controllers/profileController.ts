import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { ProfileService } from "../services/profileService";
import { z } from "zod";
import { BadRequestError } from "../utils/errors";

const profileService = new ProfileService();

// Validation Schema for Profiles & Preferences Unified Form
const updateProfileSchema = z.object({
  name: z.string().min(1, "Name is required"),
  gender: z.number().int().min(0).max(1), // 0 = Male, 1 = Female
  currentCity: z.string().min(1, "Current city is required"),
  hometown: z.string().min(1, "Hometown is required"),
  course: z.string().min(1, "Course program is required"),
  workEx: z.number().min(0, "Work experience cannot be negative"),
  bio: z.string().optional(),
  profileImage: z.string().optional(),
  needRoommate: z.boolean().optional(),
  
  // Preferences
  rentBudget: z.number().min(0, "Rent budget must be positive"),
  distFromUni: z.number().min(0, "Distance must be positive"),
  maxPpr: z.number().int().min(1, "Maximum persons per room must be at least 1"),
  alcohol: z.number().int().min(0).max(2), // 0=Flex, 1=No, 2=Yes
  smoking: z.number().int().min(0).max(2), // 0=Flex, 1=No, 2=Yes
  foodPref: z.number().int().min(0).max(2), // 0=Flex, 1=Veg, 2=Non-Veg
  culSkills: z.number().int().min(0).max(2), // 0=Sometimes, 1=Expert, 2=Never
  housingTypes: z.array(z.string()).default([]),
  openToOtherBranch: z.number().int().min(0).max(1), // 0=Yes, 1=No
});

export class ProfileController {
  async getProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new BadRequestError("User context missing");
      }

      const profile = await profileService.getProfile(userId);

      return res.status(200).json({
        success: true,
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new BadRequestError("User context missing");
      }

      const parsed = updateProfileSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new BadRequestError(parsed.error.errors[0].message);
      }

      const profile = await profileService.updateProfileAndPreferences(userId, parsed.data);

      return res.status(200).json({
        success: true,
        message: "Profile updated successfully",
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  }
}
