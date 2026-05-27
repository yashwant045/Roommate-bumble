import prisma from "../config/prisma";
import { Profile, Preferences } from "@prisma/client";

export class ProfileRepository {
  async findByUserId(userId: string): Promise<(Profile & { preferences: Preferences | null }) | null> {
    const profile = await prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) return null;

    const preferences = await prisma.preferences.findUnique({
      where: { userId },
    });

    return {
      ...profile,
      preferences,
    };
  }

  async upsertProfile(
    userId: string,
    data: {
      name: string;
      gender: number;
      currentCity: string;
      hometown: string;
      course: string;
      workEx: number;
      bio?: string;
      profileImage?: string;
      needRoommate?: boolean;
    }
  ): Promise<Profile> {
    return prisma.profile.upsert({
      where: { userId },
      update: {
        name: data.name,
        gender: data.gender,
        currentCity: data.currentCity.toLowerCase().trim(),
        hometown: data.hometown,
        course: data.course,
        workEx: data.workEx,
        bio: data.bio ?? null,
        profileImage: data.profileImage ?? "",
        needRoommate: data.needRoommate ?? true,
      },
      create: {
        userId,
        name: data.name,
        gender: data.gender,
        currentCity: data.currentCity.toLowerCase().trim(),
        hometown: data.hometown,
        course: data.course,
        workEx: data.workEx,
        bio: data.bio ?? null,
        profileImage: data.profileImage ?? "",
        needRoommate: data.needRoommate ?? true,
      },
    });
  }

  async upsertPreferences(
    userId: string,
    data: {
      rentBudget: number;
      distFromUni: number;
      maxPpr: number;
      alcohol: number;
      smoking: number;
      foodPref: number;
      culSkills: number;
      housingTypes: string[];
      openToOtherBranch: number;
    }
  ): Promise<Preferences> {
    return prisma.preferences.upsert({
      where: { userId },
      update: data,
      create: {
        userId,
        ...data,
      },
    });
  }
}
