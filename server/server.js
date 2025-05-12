
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

if(process.env.NODE_ENV !== "production"){

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log("🚀 Server is running on PORT:", PORT);
});
}
module.exports = server