import bcrypt from "bcrypt";
import { UserRepository } from "../repositories/userRepository";
import { 
  generateAccessToken, 
  generateRefreshToken, 
  verifyRefreshToken 
} from "../utils/jwt";
import { 
  BadRequestError, 
  ConflictError, 
  UnauthorizedError 
} from "../utils/errors";

const userRepository = new UserRepository();

export class AuthService {
  async register(data: { email: string; password: string }) {
    // Check if user already exists
    const existingUser = await userRepository.findByEmail(data.email);
    if (existingUser) {
      throw new ConflictError("Email already in use");
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Create user
    const newUser = await userRepository.createUser({
      email: data.email,
      password: hashedPassword,
    });

    // Create initial profiles & preferences template (helps in next wizard steps)
    // We will complete profiles in Phase 3.

    // Generate tokens
    const accessToken = generateAccessToken({ userId: newUser.id, email: newUser.email });
    const refreshToken = generateRefreshToken({ userId: newUser.id, email: newUser.email });

    // Save refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration
    
    // Hash refresh token before storing
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    
    await userRepository.createRefreshToken({
      token: hashedRefreshToken,
      userId: newUser.id,
      expiresAt,
    });

    return {
      userId: newUser.id,
      email: newUser.email,
      accessToken,
      refreshToken,
    };
  }

  async login(data: { email: string; password: string }) {
    // Check user exists
    const user = await userRepository.findByEmail(data.email);
    if (!user) {
      throw new UnauthorizedError("Invalid email or password");
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(data.password, user.password);
    if (!isValidPassword) {
      throw new UnauthorizedError("Invalid email or password");
    }

    // Generate tokens
    const accessToken = generateAccessToken({ userId: user.id, email: user.email });
    const refreshToken = generateRefreshToken({ userId: user.id, email: user.email });

    // Save refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    
    // Hash refresh token before storing
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    
    await userRepository.createRefreshToken({
      token: hashedRefreshToken,
      userId: user.id,
      expiresAt,
    });

    return {
      userId: user.id,
      email: user.email,
      accessToken,
      refreshToken,
    };
  }

  async refresh(token: string) {
    if (!token) {
      throw new BadRequestError("Refresh token required");
    }

    // Verify token structure
    let decoded: any;
    try {
      decoded = verifyRefreshToken(token);
    } catch (err) {
      throw new UnauthorizedError("Invalid or expired refresh token");
    }

    // Check against hashed tokens in DB
    const storedTokens = await userRepository.findRefreshTokensByUserId(decoded.userId);
    let validStoredToken = null;
    
    for (const st of storedTokens) {
      const isMatch = await bcrypt.compare(token, st.token);
      if (isMatch) {
        validStoredToken = st;
        break;
      }
    }

    if (!validStoredToken || validStoredToken.expiresAt < new Date()) {
      if (validStoredToken) {
        await userRepository.deleteRefreshToken(validStoredToken.token);
      }
      throw new UnauthorizedError("Invalid or expired refresh token");
    }

    // Generate new access token
    const newAccessToken = generateAccessToken({
      userId: validStoredToken.user.id,
      email: validStoredToken.user.email,
    });

    return {
      accessToken: newAccessToken,
    };
  }

  async logout(token: string) {
    if (!token) {
      throw new BadRequestError("Refresh token required");
    }
    
    let decoded: any;
    try {
      decoded = verifyRefreshToken(token);
    } catch (err) {
      return; // Token already invalid or tampered with
    }

    const storedTokens = await userRepository.findRefreshTokensByUserId(decoded.userId);
    for (const st of storedTokens) {
      if (await bcrypt.compare(token, st.token)) {
        // Delete the explicitly matched hashed token
        await userRepository.deleteRefreshToken(st.token);
        break;
      }
    }
  }
}
