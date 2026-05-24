import { ProfileRepository } from "../repositories/profileRepository";
import { NotFoundError } from "../utils/errors";

const profileRepository = new ProfileRepository();

export class ProfileService {
  async getProfile(userId: string) {
    const profile = await profileRepository.findByUserId(userId);
    if (!profile) {
      throw new NotFoundError("Profile not initialized yet");
    }
    return profile;
  }

  async updateProfileAndPreferences(
    userId: string,
    data: {
      // Profile
      name: string;
      gender: number;
      currentCity: string;
      hometown: string;
      course: string;
      workEx: number;
      bio?: string;
      profileImage?: string;
      needRoommate?: boolean;
      // Preferences
      rentBudget: number;
      distFromUni: number;
      maxPpr: number;
      alcohol: number;
      smoking: number;
      foodPref: number;
      culSkills: number;
      bhk1: number;
      bhk2: number;
      bhk3: number;
      bhk4: number;
      hall: number;
      openToOtherBranch: number;
    }
  ) {
    // Upsert Profile
    const profile = await profileRepository.upsertProfile(userId, {
      name: data.name,
      gender: data.gender,
      currentCity: data.currentCity,
      hometown: data.hometown,
      course: data.course,
      workEx: data.workEx,
      bio: data.bio,
      profileImage: data.profileImage,
      needRoommate: data.needRoommate,
    });

    // Upsert Preferences
    const preferences = await profileRepository.upsertPreferences(userId, {
      rentBudget: data.rentBudget,
      distFromUni: data.distFromUni,
      maxPpr: data.maxPpr,
      alcohol: data.alcohol,
      smoking: data.smoking,
      foodPref: data.foodPref,
      culSkills: data.culSkills,
      bhk1: data.bhk1,
      bhk2: data.bhk2,
      bhk3: data.bhk3,
      bhk4: data.bhk4,
      hall: data.hall,
      openToOtherBranch: data.openToOtherBranch,
    });

    return {
      ...profile,
      preferences,
    };
  }
}
