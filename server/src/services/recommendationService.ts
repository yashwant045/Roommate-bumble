import prisma from "../config/prisma";
import axios from "axios";
import { NotFoundError } from "../utils/errors";

export class RecommendationService {
  async getRecommendations(userId: string) {
    // 1. Fetch target user's profile & preferences
    const targetProfile = await prisma.profile.findUnique({
      where: { userId },
      include: { user: { include: { preferences: true } } },
    });

    if (!targetProfile || !targetProfile.user.preferences) {
      throw new NotFoundError("Please complete your profile and preferences first");
    }

    // 2. Fetch candidate profiles of the SAME GENDER, exclude the target user, and exclude those already swiped/matched
    const existingSwipes = await prisma.swipe.findMany({
      where: { swiperId: userId },
      select: { swipeeId: true }
    });
    const excludedUserIds = existingSwipes.map(s => s.swipeeId);

    const candidates = await prisma.profile.findMany({
      where: {
        gender: targetProfile.gender,
        userId: { 
          not: userId,
          notIn: excludedUserIds
        },
        needRoommate: true,
      },
      include: {
        user: {
          include: {
            preferences: true,
          },
        },
      },
    });

    if (candidates.length === 0) {
      return [];
    }

    // Helper to format database objects into Pydantic schema keys
    const formatProfile = (p: any) => ({
      userId: p.userId,
      name: p.name,
      gender: p.gender,
      currentCity: p.currentCity,
      hometown: p.hometown,
      course: p.course,
      workEx: p.workEx,
      needRoommate: p.needRoommate,
      // Preferences mapping
      rentBudget: p.user.preferences?.rentBudget ?? 500,
      distFromUni: p.user.preferences?.distFromUni ?? 5.0,
      maxPpr: p.user.preferences?.maxPpr ?? 2,
      alcohol: p.user.preferences?.alcohol ?? 0,
      smoking: p.user.preferences?.smoking ?? 0,
      foodPref: p.user.preferences?.foodPref ?? 0,
      culSkills: p.user.preferences?.culSkills ?? 0,
      housingTypes: p.user.preferences?.housingTypes ?? [],
      openToOtherBranch: p.user.preferences?.openToOtherBranch ?? 0,
    });

    const targetPayload = formatProfile(targetProfile);
    const candidatesPayload = candidates
      .filter((c: any) => c.user.preferences !== null)
      .map((c: any) => formatProfile(c));

    if (candidatesPayload.length === 0) {
      return [];
    }

    // 3. Query the FastAPI ML microservice
    const mlServiceUrl = process.env.ML_SERVICE_URL || "http://localhost:8000";
    try {
      const response = await axios.post(`${mlServiceUrl}/recommendations`, {
        target: targetPayload,
        candidates: candidatesPayload,
        alpha: 1.0,
        beta: 1.0,
      });

      if (response.data.success) {
        const rankedMatches = response.data.matches;
        
        // 4. Bundle database profile metadata alongside scores
        const results = rankedMatches.map((match: any) => {
          const originalCand = candidates.find((c: any) => c.userId === match.userId);
          return {
            ...match,
            profile: originalCand ? {
              name: originalCand.name,
              gender: originalCand.gender,
              currentCity: originalCand.currentCity,
              hometown: originalCand.hometown,
              course: originalCand.course,
              workEx: originalCand.workEx,
              bio: originalCand.bio,
              profileImage: originalCand.profileImage,
              preferences: originalCand.user.preferences
            } : null
          };
        });

        return results;
      } else {
        throw new Error("ML service returned success=false");
      }
    } catch (err: any) {
      console.error("Error communicating with ML microservice:", err.message);
      // Fallback: return candidates unsorted
      return candidates.map((c: any) => ({
        userId: c.userId,
        name: c.name,
        score: 999.0,
        compatibility: 50.0,
        profile: {
          name: c.name,
          gender: c.gender,
          currentCity: c.currentCity,
          hometown: c.hometown,
          course: c.course,
          workEx: c.workEx,
          bio: c.bio,
          profileImage: c.profileImage,
          preferences: c.user.preferences
        }
      }));
    }
  }
}
