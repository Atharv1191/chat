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

        // Debugging: Ensure the receiver's socket is in the userSocketMap
        const receiverSocketId = userSocketMap[receiverId];

        console.log("Receiver Socket ID for receiver:", receiverId, "=>", receiverSocketId);

        if (receiverSocketId) {
            // Ensure io is properly initialized
            if (io && io.sockets && io.sockets.sockets.get(receiverSocketId)) {
                io.to(receiverSocketId).emit("newMessage", newMessage);
                console.log("Message sent to receiver:", receiverId);
            } else {
                console.log("Receiver is not connected or socket has been disconnected.");
            }
        } else {
            console.log("Socket not found for receiver:", receiverId);
        }

        res.json({
            success: true,
            newMessage,
        });
    } catch (error) {
        console.log("Error in sending message:", error);
        res.json({
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
