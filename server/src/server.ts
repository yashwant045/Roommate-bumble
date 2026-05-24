import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import path from "path";
import authRoutes from "./routes/authRoutes";
import profileRoutes from "./routes/profileRoutes";
import recommendationRoutes from "./routes/recommendationRoutes";
import swipeRoutes from "./routes/swipeRoutes";
import messageRoutes from "./routes/messageRoutes";
import listingRoutes from "./routes/listingRoutes";
import uploadRoutes from "./routes/uploadRoutes";
import { errorMiddleware } from "./middlewares/errorMiddleware";
import { verifyAccessToken } from "./utils/jwt";
import { MessageService } from "./services/messageService";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

const messageService = new MessageService();

// Enable CORS
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  })
);

app.use(express.json());

// Serve local uploaded assets statically
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Base health route
app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    message: "Roommate Bumble Backend Server is running!",
    timestamp: new Date(),
  });
});

// Register routes
app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/recommendations", recommendationRoutes);
app.use("/api/swipes", swipeRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/listings", listingRoutes);
app.use("/api/uploads", uploadRoutes);

// Register global error middleware
app.use(errorMiddleware);

const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Secure Socket.IO with JWT Token Validation
io.use((socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  if (!token) {
    return next(new Error("Authentication token required"));
  }
  try {
    const decoded = verifyAccessToken(token as string);
    socket.data = { user: decoded };
    next();
  } catch (err) {
    next(new Error("Authentication failed: invalid or expired token"));
  }
});

io.on("connection", (socket) => {
  const user = socket.data.user;
  console.log(`User connected: ${user.email} (${socket.id})`);

  socket.on("join_room", (data: { matchId: string }) => {
    socket.join(data.matchId);
    console.log(`User ${user.email} joined room: ${data.matchId}`);
  });

  socket.on("send_message", async (data: {
    matchId: string;
    content: string;
  }) => {
    try {
      // Persist the message to PostgreSQL
      const savedMessage = await messageService.saveMessage(data.matchId, user.userId, data.content);
      
      // Broadcast the persisted message to all users in the match room
      io.to(data.matchId).emit("receive_message", savedMessage);
    } catch (error: any) {
      console.error("Error saving message via socket:", error.message);
      socket.emit("error_event", { message: error.message || "Failed to deliver message" });
    }
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${user.email} (${socket.id})`);
  });
});

server.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});
