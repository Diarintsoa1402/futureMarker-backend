// src/server.js
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const session = require("express-session");
const passport = require("./config/passport");
const sequelize = require("./config/database");
require("dotenv").config();
const http = require("http");
// Dans app.js ou server.js

const { Server } = require("socket.io");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// ✅ Charger TOUS les modèles et associations AVANT tout
const models = require("./models/"); // Charge models/index.js avec toutes les associations

// Routes existantes
const coursesRoutes = require("./routes/courses");
const quizRoutes = require("./routes/quiz");
const miniRoutes = require("./routes/miniEnterprise");
const rankingRoutes = require("./routes/ranking");
const userRoutes = require("./routes/user");
const adminRoutes = require("./routes/admin");
const progressRoutes = require("./routes/progress");
const mentorshipSessionRoutes = require("./routes/mentorshipSession");
const progressionRoutes = require("./routes/progression");
const mentorRoutes = require("./routes/mentor");
const visioRoutes = require("./routes/visio");
const chatRoutes = require("./routes/chat");
const womanRoutes = require("./routes/woman");
const app = express();
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173",
  credentials: true
}));
app.use(express.json());

// Session pour Passport
app.use(session({
  secret: process.env.SESSION_SECRET || "your-secret-key",
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

// ✅ Uploads pour chat
const uploadDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });
app.post("/api/chat/upload", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ message: "Aucun fichier reçu" });
  res.json({ fileUrl: `/uploads/${req.file.filename}` });
});
app.use("/uploads", express.static(uploadDir));
// Also serve avatar subfolder explicitly if needed (uploadDir/avatars)
app.use("/uploads/avatars", express.static(path.join(uploadDir, "avatars")));

// 🔗 Routes principales
const authRoutes = require("./routes/auth");
app.use("/api/auth", authRoutes);
app.use("/api/courses", coursesRoutes);
app.use("/api/quizzes", quizRoutes);
app.use("/api/mini-enterprise", miniRoutes);
app.use("/api/ranking", rankingRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/results", require("./routes/result"));
app.use("/api/projects", require("./routes/project"));
app.use("/api/mentorships", require("./routes/mentorship"));
app.use("/api/fundings", require("./routes/funding"));
app.use("/api/users", userRoutes);
app.use("/api/profile", require("./routes/profile"));

app.use("/api/progress", progressRoutes);
app.use("/api/mentorship-sessions", mentorshipSessionRoutes);
app.use("/api/progression", progressionRoutes);
app.use("/api/mentor", mentorRoutes);
app.use("/api/visio", visioRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/woman", womanRoutes);

// Servir les certificats statiques
app.use("/certificates", express.static(path.join(__dirname, "../public/certificates")));

// Test
app.get("/", (req, res) => res.send("FutureMakers Hub API + Chat OK"));

// ⚡ Création serveur HTTP + Socket.IO
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
const onlineUsers = new Map();

// Gestion des sockets
io.on("connection", (socket) => {
  console.log("🟢 Socket connecté :", socket.id);

  socket.on("join", (userId) => {
    onlineUsers.set(userId, socket.id);
    io.emit("onlineUsers", Array.from(onlineUsers.keys()));
  });

  // Message privé
  socket.on("sendMessage", async ({ conversationId, senderId, receiverId, content, fileUrl }) => {
    try {
      const msg = await models.Message.create({ conversationId, senderId, content, fileUrl });
      if (conversationId && content) {
        await models.Conversation.update({ lastMessage: content }, { where: { id: conversationId } });
      }

      const receiverSocket = onlineUsers.get(receiverId);
      if (receiverSocket) {
        io.to(receiverSocket).emit("receiveMessage", msg);
        await msg.update({ status: "livré" });
      }
      socket.emit("messageSent", msg);
    } catch (error) {
      console.error("Erreur sendMessage:", error);
      socket.emit("messageError", { error: error.message });
    }
  });

  // Message de groupe
  socket.on("joinGroup", (groupId) => socket.join(`group_${groupId}`));
  socket.on("leaveGroup", (groupId) => socket.leave(`group_${groupId}`));
  socket.on("sendGroupMessage", async ({ groupId, senderId, content, fileUrl }) => {
    try {
      const msg = await models.Message.create({ groupId, senderId, content, fileUrl });
      io.to(`group_${groupId}`).emit("receiveGroupMessage", msg);
    } catch (error) {
      console.error("Erreur sendGroupMessage:", error);
      socket.emit("messageError", { error: error.message });
    }
  });

  socket.on("disconnect", () => {
    for (let [uid, sid] of onlineUsers.entries()) {
      if (sid === socket.id) onlineUsers.delete(uid);
    }
    io.emit("onlineUsers", Array.from(onlineUsers.keys()));
    console.log("🔴 Déconnexion :", socket.id);
  });
});

// ✅ Lancement serveur
(async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ DB connectée");
    await sequelize.sync({ alter: true });

    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => console.log(`🚀 API + Chat en ligne sur http://localhost:${PORT}`));
  } catch (err) {
    console.error("❌ Erreur de démarrage", err);
  }
})();