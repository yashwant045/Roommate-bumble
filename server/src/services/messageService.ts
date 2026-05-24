import { MessageRepository } from "../repositories/messageRepository";
import { SwipeRepository } from "../repositories/swipeRepository";
import { ForbiddenError, NotFoundError } from "../utils/errors";

const messageRepository = new MessageRepository();
const swipeRepository = new SwipeRepository();

export class MessageService {
  async getMessages(matchId: string, userId: string) {
    // 1. Fetch match record
    const match = await swipeRepository.findMatchById(matchId);
    if (!match) {
      throw new NotFoundError("Match not found");
    }

    // 2. Validate participation: requesting user must be user1 or user2
    if (match.user1Id !== userId && match.user2Id !== userId) {
      throw new ForbiddenError("You are not authorized to view messages for this match");
    }

    // 3. Fetch history
    return messageRepository.getMessagesByMatchId(matchId);
  }

  async saveMessage(matchId: string, senderId: string, content: string) {
    // 1. Fetch match record
    const match = await swipeRepository.findMatchById(matchId);
    if (!match) {
      throw new NotFoundError("Match not found");
    }

    // 2. Validate participation
    if (match.user1Id !== senderId && match.user2Id !== senderId) {
      throw new ForbiddenError("You are not authorized to send messages for this match");
    }

    // 3. Determine the receiverId (the other participant)
    const receiverId = match.user1Id === senderId ? match.user2Id : match.user1Id;

    // 4. Save to database
    return messageRepository.createMessage(matchId, senderId, receiverId, content);
  }
}
