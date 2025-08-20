// let io = null;
// const userSocketMap = {}; // userId => socketId

// function initSocket(server) {
//     const { Server } = require("socket.io");
//     io = new Server(server, {
//         cors: { origin: "*" },
//     });

//     io.on("connection", (socket) => {
//         const userId = socket.handshake.query.userId;
//         console.log("✅ User Connected:", userId, "| Socket ID:", socket.id);

//         if (userId) {
//             userSocketMap[userId] = socket.id;
//         }

//         io.emit("getOnlineUsers", Object.keys(userSocketMap));

//         socket.on("disconnect", () => {
//             console.log("❌ User Disconnected:", userId, "| Socket ID:", socket.id);
//             delete userSocketMap[userId];
//             io.emit("getOnlineUsers", Object.keys(userSocketMap));
//         });
//     });
// }

// module.exports = {
//     initSocket,
//     get io() {
//         return io; // Access the io instance
//     },
//     userSocketMap,
// };
let io = null;
const userSocketMap = {}; // userId => socketId

function initSocket(server) {
    const { Server } = require("socket.io");
    io = new Server(server, {
        cors: { origin: "*" },
    });

    io.on("connection", (socket) => {
        const userId = socket.handshake.query.userId;
        console.log("✅ User Connected:", userId, "| Socket ID:", socket.id);

        if (userId) {
            userSocketMap[userId] = socket.id;
        }

        io.emit("getOnlineUsers", Object.keys(userSocketMap));

        socket.on("disconnect", () => {
            console.log("❌ User Disconnected:", userId, "| Socket ID:", socket.id);
            delete userSocketMap[userId];
            io.emit("getOnlineUsers", Object.keys(userSocketMap));
        });
    });

    return io; // Return the io instance
}

// Safe getter that checks if io is initialized
function getIO() {
    if (!io) {
        throw new Error("Socket.IO not initialized. Call initSocket() first.");
    }
    return io;
}

// Check if socket is initialized
function isSocketInitialized() {
    return io !== null;
}

module.exports = {
    initSocket,
    getIO,
    isSocketInitialized,
    userSocketMap,
    // Keep the getter for backward compatibility, but make it safer
    get io() {
        return io;
    }
};