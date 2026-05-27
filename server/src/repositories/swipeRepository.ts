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

  async findPendingRequests(userId: string) {
    // 1. Get all matches for this user to know who to exclude
    const matches = await this.findMatches(userId);
    const matchedUserIds = matches.map(m => m.user1Id === userId ? m.user2Id : m.user1Id);

    // 2. Query incoming swipes where the swiper is NOT in the matched users list
    return prisma.swipe.findMany({
      where: {
        swipeeId: userId,
        liked: true,
        swiperId: {
          notIn: matchedUserIds
        }
      },
      include: {
        swiper: {
          include: {
            profile: true,
            preferences: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }
}
