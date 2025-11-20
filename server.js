const { createServer } = require("http");
const { Server } = require("socket.io");

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:3000", // Your Next.js app URL
    methods: ["GET", "POST"],
  },
});

const users = new Map();
const messages = [];
const MAX_MESSAGES = 50; // Keep last 50 messages

io.on("connection", (socket) => {
  const username = socket.handshake.query.username || "Anonymous";
  
  console.log(`✅ User connected: ${username} (${socket.id})`);

  // Add user to map
  users.set(socket.id, {
    socketId: socket.id,
    name: username,
    color: getRandomColor(),
    pos: { x: 0, y: 0 },
    location: "",
    flag: "",
  });

  // Broadcast updated user count
  io.emit("users-update", Array.from(users.values()));
  console.log(`👥 Total users online: ${users.size}`);

  // Send existing messages to new user
  socket.emit("msgs-receive-init", messages);

  // Handle new messages
  socket.on("msg-send", (content) => {
    const message = {
      socketId: socket.id,
      content: content,
      time: new Date(),
      username: username,
    };
    
    messages.push(message);
    
    // Keep only last MAX_MESSAGES
    if (messages.length > MAX_MESSAGES) {
      messages.shift();
    }
    
    console.log(`💬 Message from ${username}: ${content}`);
    
    // Broadcast to all clients
    io.emit("msg-receive", message);
  });

  // Handle cursor movement
  socket.on("cursor-move", (pos) => {
    const user = users.get(socket.id);
    if (user) {
      user.pos = pos;
      socket.broadcast.emit("cursor-update", {
        socketId: socket.id,
        pos: pos,
      });
    }
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    console.log(`❌ User disconnected: ${username} (${socket.id})`);
    users.delete(socket.id);
    io.emit("users-update", Array.from(users.values()));
    console.log(`👥 Total users online: ${users.size}`);
  });
});

// Helper function to generate random colors for user cursors
function getRandomColor() {
  const colors = [
    "#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", 
    "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E2",
    "#F06292", "#AED581", "#FFD54F", "#90CAF9"
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║  🚀 Socket.IO Server is running!      ║
║  📡 http://localhost:${PORT}          ║
║  ✨ Waiting for connections...        ║
╚════════════════════════════════════════╝
  `);
});