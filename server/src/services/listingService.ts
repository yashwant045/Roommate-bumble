import { ListingRepository } from "../repositories/listingRepository";
import { ForbiddenError, NotFoundError } from "../utils/errors";

const listingRepository = new ListingRepository();

export class ListingService {
  async createListing(
    userId: string,
    data: {
      title: string;
      description: string;
      rent: number;
      address: string;
      images: string[];
      amenities: string[];
    }
  ) {
    return listingRepository.createListing(userId, data);
  }

  async getAllListings() {
    return listingRepository.findAllListings();
  }

  async deleteListing(id: string, userId: string) {
    const listing = await listingRepository.findListingById(id);
    if (!listing) {
      throw new NotFoundError("Listing not found");
    }

    if (listing.userId !== userId) {
      throw new ForbiddenError("You are not authorized to delete this listing");
    }

    return listingRepository.deleteListing(id);
  }
}
