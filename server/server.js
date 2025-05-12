// const express = require("express");
// require('dotenv').config();
// const cors = require("cors");
// const http = require("http");
// const connectDB = require("./lib/db");
// const userRoute = require("./routes/userRoutes");
// const messageRoute = require("./routes/messageRoutes");
// const { Server } = require("socket.io");

// const app = express();
// const server = http.createServer(app);

// const io = new Server(server, {
//     cors: { origin: "*" }
// });

// const userSocketMap = {}; // userId -> socketId

// // Socket.io connection handler
// io.on("connection", (socket) => {
//     const userId = socket.handshake.query.userId;
//     console.log("User Connected:", userId);

//     if (userId) {
//         userSocketMap[userId] = socket.id;
//     }

//     io.emit("getOnlineUsers", Object.keys(userSocketMap));

//     socket.on("disconnect", () => {
//         console.log("User Disconnected:", userId);
//         delete userSocketMap[userId];
//         io.emit("getOnlineUsers", Object.keys(userSocketMap));
//     });
// });

// // Middleware
// app.use(express.json({ limit: "4mb" }));
// app.use(cors());

// // Health check
// app.use("/api/status", (req, res) => res.send("Server is live"));

// // Routes
// app.use("/api/auth", userRoute);
// app.use("/api/messages", messageRoute);

// // Connect to database
// connectDB();

// const PORT = process.env.PORT || 5000;
// server.listen(PORT, () => {
//     console.log("Server is running on PORT:", PORT);
// });

// // ✅ Export properly
// module.exports = {
//     io,
//     userSocketMap
// };
// server.js

const express = require("express");
require('dotenv').config();
const cors = require("cors");
const http = require("http");
const connectDB = require("./lib/db");
const userRoute = require("./routes/userRoutes");
const messageRoute = require("./routes/messageRoutes");
const { initSocket } = require("./lib/socket");

const app = express();
const server = http.createServer(app);

// ✅ Initialize Socket.IO only after server is created
initSocket(server);

// Middleware
app.use(express.json({ limit: "4mb" }));
app.use(cors());

// Health check
app.use("/api/status", (req, res) => res.send("Server is live"));

// Routes
app.use("/api/auth", userRoute);
app.use("/api/messages", messageRoute);

// Database connection
connectDB();

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log("🚀 Server is running on PORT:", PORT);
});
