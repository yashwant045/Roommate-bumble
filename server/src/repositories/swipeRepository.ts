import prisma from "../config/prisma";
import { Swipe, Match } from "@prisma/client";

export class SwipeRepository {
  async createSwipe(swiperId: string, swipeeId: string, liked: boolean): Promise<Swipe> {
    return prisma.swipe.upsert({
      where: {
        swiperId_swipeeId: {
          swiperId,
          swipeeId,
        },
      },
      update: {
        liked,
      },
      create: {
        swiperId,
        swipeeId,
        liked,
      },
    });
  }

  async checkMutualLike(swiperId: string, swipeeId: string): Promise<boolean> {
    const reciprocalSwipe = await prisma.swipe.findUnique({
      where: {
        swiperId_swipeeId: {
          swiperId: swipeeId,
          swipeeId: swiperId,
        },
      },
    });
    return reciprocalSwipe ? reciprocalSwipe.liked : false;
  }

  async createMatch(swiperId: string, swipeeId: string): Promise<Match> {
    // Standardize ordering of user IDs to prevent duplicate reversed entries in the database
    const [user1Id, user2Id] = [swiperId, swipeeId].sort();

    return prisma.match.upsert({
      where: {
        user1Id_user2Id: {
          user1Id,
          user2Id,
        },
      },
      update: {},
      create: {
        user1Id,
        user2Id,
      },
    });
  }

  async findMatches(userId: string) {
    return prisma.match.findMany({
      where: {
        OR: [
          { user1Id: userId },
          { user2Id: userId },
        ],
      },
      include: {
        user1: {
          include: {
            profile: true,
          },
        },
        user2: {
          include: {
            profile: true,
          },
        },
      },
    });
  }

  async findMatchById(matchId: string): Promise<Match | null> {
    return prisma.match.findUnique({
      where: { id: matchId },
    });
  }
}
