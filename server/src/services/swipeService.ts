import { SwipeRepository } from "../repositories/swipeRepository";

const swipeRepository = new SwipeRepository();

export class SwipeService {
  async swipe(swiperId: string, swipeeId: string, liked: boolean) {
    // 1. Create the swipe record
    const swipe = await swipeRepository.createSwipe(swiperId, swipeeId, liked);

    // 2. If it's a "like", check for a mutual like
    let matchCreated = false;
    let matchId: string | null = null;

    if (liked) {
      const isMutual = await swipeRepository.checkMutualLike(swiperId, swipeeId);
      if (isMutual) {
        const match = await swipeRepository.createMatch(swiperId, swipeeId);
        matchCreated = true;
        matchId = match.id;
      }
    }

    return {
      swipe,
      matchCreated,
      matchId,
    };
  }

  async getMatches(userId: string) {
    const rawMatches = await swipeRepository.findMatches(userId);

    // Filter and map so the returned list has the details of the OTHER user
    return rawMatches.map((m: any) => {
      const isUser1 = m.user1Id === userId;
      const otherUser = isUser1 ? m.user2 : m.user1;

      return {
        matchId: m.id,
        matchedAt: m.createdAt,
        user: {
          id: otherUser.id,
          email: otherUser.email,
          profile: otherUser.profile,
        },
      };
    });
  }

  async getPendingRequests(userId: string) {
    const rawRequests = await swipeRepository.findPendingRequests(userId);
    
    // Format the response to include the swiper's details
    return rawRequests.map((req: any) => {
      return {
        swipeId: req.id,
        swipedAt: req.createdAt,
        user: {
          id: req.swiper.id,
          email: req.swiper.email,
          profile: req.swiper.profile,
          preferences: req.swiper.preferences
        }
      };
    });
  }
}
