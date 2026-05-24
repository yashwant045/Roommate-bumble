import prisma from "../config/prisma";
import { Listing } from "@prisma/client";

export class ListingRepository {
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
  ): Promise<Listing> {
    return prisma.listing.create({
      data: {
        userId,
        title: data.title,
        description: data.description,
        rent: data.rent,
        address: data.address,
        images: data.images,
        amenities: data.amenities,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                name: true,
                profileImage: true,
              },
            },
          },
        },
      },
    });
  }

  async findAllListings(): Promise<Listing[]> {
    return prisma.listing.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                name: true,
                profileImage: true,
              },
            },
          },
        },
      },
    });
  }

  async findListingById(id: string): Promise<Listing | null> {
    return prisma.listing.findUnique({
      where: { id },
    });
  }

  async deleteListing(id: string): Promise<Listing> {
    return prisma.listing.delete({
      where: { id },
    });
  }
}
