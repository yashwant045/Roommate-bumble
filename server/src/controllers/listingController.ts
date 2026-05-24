import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { ListingService } from "../services/listingService";
import { z } from "zod";
import { BadRequestError } from "../utils/errors";

const listingService = new ListingService();

const createListingSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters long"),
  description: z.string().min(10, "Description must be at least 10 characters long"),
  rent: z.number().positive("Rent must be a positive number"),
  address: z.string().min(5, "Address must be at least 5 characters long"),
  images: z.array(z.string()).default([]),
  amenities: z.array(z.string()).default([]),
});

export class ListingController {
  async createListing(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new BadRequestError("User context missing");
      }

      const parsed = createListingSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new BadRequestError(parsed.error.errors[0].message);
      }

      const listing = await listingService.createListing(userId, parsed.data);

      return res.status(201).json({
        success: true,
        message: "Listing created successfully",
        data: listing,
      });
    } catch (error) {
      next(error);
    }
  }

  async getListings(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const listings = await listingService.getAllListings();

      return res.status(200).json({
        success: true,
        data: listings,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteListing(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new BadRequestError("User context missing");
      }

      const { id } = req.params;
      if (!id) {
        throw new BadRequestError("Listing ID is required");
      }

      await listingService.deleteListing(id, userId);

      return res.status(200).json({
        success: true,
        message: "Listing deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  }
}
