import prisma from "../config/prisma";
import { User, RefreshToken } from "@prisma/client";

export class UserRepository {
  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
    });
  }

  async createUser(data: { email: string; password: string }): Promise<User> {
    return prisma.user.create({
      data: {
        email: data.email,
        password: data.password,
      },
    });
  }

  async createRefreshToken(data: {
    token: string;
    userId: string;
    expiresAt: Date;
  }): Promise<RefreshToken> {
    return prisma.refreshToken.create({
      data: {
        token: data.token,
        userId: data.userId,
        expiresAt: data.expiresAt,
      },
    });
  }

  async findRefreshToken(token: string): Promise<any> {
    return prisma.refreshToken.findUnique({
      where: { token },
      include: { user: true },
    });
  }

  async findRefreshTokensByUserId(userId: string): Promise<any[]> {
    return prisma.refreshToken.findMany({
      where: { userId },
      include: { user: true },
    });
  }

  async deleteRefreshToken(token: string): Promise<void> {
    await prisma.refreshToken.deleteMany({
      where: { token },
    });
  }

  async deleteUserRefreshTokens(userId: string): Promise<void> {
    await prisma.refreshToken.deleteMany({
      where: { userId },
    });
  }
}
