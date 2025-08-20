const Message = require("../models/Message");
const User = require("../models/User");
const cloudinary = require("../lib/Cloudinary");
const { io, userSocketMap } = require("../lib/socket"); 

// Get all users except the logged-in user
const getUserForSidebar = async (req, res) => {
    try {
        const userId = req.user._id;
        const filteredUsers = await User.find({ _id: { $ne: userId } }).select("-password");

        const unseenMessages = {};
        const promises = filteredUsers.map(async (user) => {
            const messages = await Message.find({
                senderId: user._id,
                receiverId: userId,
                seen: false
            });

            if (messages.length > 0) {
                unseenMessages[user._id] = messages.length;
            }
        });

        await Promise.all(promises);

        return res.status(200).json({
            success: true,
            users: filteredUsers,
            unseenMessages
        });

    } catch (error) {
        console.error(error.message);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get all messages between two users
const getMessages = async (req, res) => {
    try {
        const selectedUserId = req.params.id;
        const myId = req.user._id;

        const messages = await Message.find({
            $or: [
                { senderId: myId, receiverId: selectedUserId },
                { senderId: selectedUserId, receiverId: myId }
            ]
        });

        await Message.updateMany(
            { senderId: selectedUserId, receiverId: myId, seen: false },
            { seen: true }
        );

        return res.status(200).json({
            success: true,
            messages
        });

    } catch (error) {
        console.error(error.message);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Mark a single message as seen
const markMessageAsSeen = async (req, res) => {
    try {
        const { id } = req.params;
        await Message.findByIdAndUpdate(id, { seen: true });

        return res.status(200).json({ success: true });

    } catch (error) {
        console.error(error.message);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Send a message
// const sendMessage = async (req, res) => {
//     try {
//         const { text, image } = req.body;
//         const receiverId = req.params.id;
//         const senderId = req.user._id;

//         let imageUrl;
//         if (image) {
//             const uploadResponse = await cloudinary.uploader.upload(image);
//             imageUrl = uploadResponse.secure_url;
//         }

//         const newMessage = await Message.create({
//             senderId,
//             receiverId,
//             text,
//             image: imageUrl,
//         });

//         // Get receiver's socket ID
//         const receiverSocketId = userSocketMap[receiverId];

//         console.log("=== SOCKET DEBUG INFO ===");
//         console.log("Sender ID:", senderId);
//         console.log("Receiver ID:", receiverId);
//         console.log("Receiver Socket ID:", receiverSocketId);
//         console.log("All connected users:", Object.keys(userSocketMap));
//         console.log("Total connected sockets:", io ? Object.keys(io.sockets.sockets).length : 0);

//         if (receiverSocketId) {
//             try {
//                 // Simple emit - let Socket.IO handle the validation
//                 io.to(receiverSocketId).emit("newMessage", newMessage);
//                 console.log("✅ Message emitted to receiver:", receiverId);
                
//                 // Optional: Verify if socket exists (for debugging)
//                 const socketExists = io.sockets.sockets.has(receiverSocketId);
//                 console.log("Socket exists in server:", socketExists);
                
//             } catch (socketError) {
//                 console.error("❌ Error emitting to socket:", socketError);
//             }
//         } else {
//             console.log("⚠️ Receiver is offline or not connected");
//         }

//         // Also emit to sender for real-time update on their side
//         const senderSocketId = userSocketMap[senderId];
//         if (senderSocketId) {
//             try {
//                 io.to(senderSocketId).emit("messageSent", newMessage);
//                 console.log("✅ Message confirmation sent to sender");
//             } catch (socketError) {
//                 console.error("❌ Error emitting to sender:", socketError);
//             }
//         }

//         res.json({
//             success: true,
//             newMessage,
//         });
        
//     } catch (error) {
//         console.error("❌ Error in sending message:", error);
//         res.status(500).json({
//             success: false,
//             message: error.message,
//         });
//     }
// };
const sendMessage = async (req, res) => {
    try {
        const { text, image } = req.body;
        const receiverId = req.params.id;
        const senderId = req.user._id;

        let imageUrl;
        if (image) {
            const uploadResponse = await cloudinary.uploader.upload(image);
            imageUrl = uploadResponse.secure_url;
        }

        const newMessage = await Message.create({
            senderId,
            receiverId,
            text,
            image: imageUrl,
        });

        // Safe way to get io instance
        const { getIO, isSocketInitialized, userSocketMap } = require("../lib/socket");
        
        if (!isSocketInitialized()) {
            console.warn("⚠️ Socket.IO not initialized, skipping real-time notifications");
            return res.json({
                success: true,
                newMessage,
            });
        }

        const io = getIO();
        
        // Get receiver's socket ID
        const receiverSocketId = userSocketMap[receiverId];

        console.log("=== SOCKET DEBUG INFO ===");
        console.log("Sender ID:", senderId);
        console.log("Receiver ID:", receiverId);
        console.log("Receiver Socket ID:", receiverSocketId);
        console.log("All connected users:", Object.keys(userSocketMap));
        console.log("Total connected sockets:", Object.keys(io.sockets.sockets).length);

        if (receiverSocketId) {
            try {
                // Verify socket exists before emitting
                const socketExists = io.sockets.sockets.has(receiverSocketId);
                
                if (socketExists) {
                    io.to(receiverSocketId).emit("newMessage", newMessage);
                    console.log("✅ Message emitted to receiver:", receiverId);
                } else {
                    console.log("⚠️ Receiver socket exists in map but not in server, cleaning up");
                    delete userSocketMap[receiverId];
                }
                
            } catch (socketError) {
                console.error("❌ Error emitting to receiver socket:", socketError);
            }
        } else {
            console.log("⚠️ Receiver is offline or not connected");
        }

        // Also emit to sender for real-time update on their side
        const senderSocketId = userSocketMap[senderId];
        if (senderSocketId) {
            try {
                const senderSocketExists = io.sockets.sockets.has(senderSocketId);
                
                if (senderSocketExists) {
                    io.to(senderSocketId).emit("messageSent", newMessage);
                    console.log("✅ Message confirmation sent to sender");
                } else {
                    console.log("⚠️ Sender socket exists in map but not in server, cleaning up");
                    delete userSocketMap[senderId];
                }
                
            } catch (socketError) {
                console.error("❌ Error emitting to sender socket:", socketError);
            }
        }

        res.json({
            success: true,
            newMessage,
        });
        
    } catch (error) {
        console.error("❌ Error in sending message:", error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
module.exports = {
    getUserForSidebar,
    getMessages,
    markMessageAsSeen,
    sendMessage
};