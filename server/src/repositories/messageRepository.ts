import prisma from "../config/prisma";
import { Message } from "@prisma/client";

export class MessageRepository {
  async createMessage(
    matchId: string,
    senderId: string,
    receiverId: string,
    content: string
  ): Promise<Message> {
    return prisma.message.create({
      data: {
        matchId,
        senderId,
        receiverId,
        content,
      },
      include: {
        sender: {
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

  async getMessagesByMatchId(matchId: string): Promise<Message[]> {
    return prisma.message.findMany({
      where: { matchId },
      orderBy: { createdAt: "asc" },
      include: {
        sender: {
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
}
