import { createContext, useContext, useEffect, useState } from "react";
import { AuthContext } from "./AuthContext";
import toast from "react-hot-toast";

// Create the context
export const ChatContext = createContext();

// Provider component
export const ChatProvider = ({ children }) => {
    const [messages, setMessages] = useState([]);
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [unseenMessages, setUnseenMessages] = useState({});

    const { socket, axios } = useContext(AuthContext);

    // Fetch all users for sidebar
    const getUsers = async () => {
        try {
            const { data } = await axios.get("/api/messages/users");
            if (data.success) {
                setUsers(data.users);
                setUnseenMessages(data.unseenMessages);
            }
        } catch (error) {
            toast.error(error.message);
        }
    };

    // Fetch messages for the selected user
    const getMessages = async (userId) => {
        if (!userId) return;

        try {
            const { data } = await axios.get(`/api/messages/${userId}`);
            setMessages(data.messages);
        } catch (error) {
            toast.error(error.message);
        }
    };

    // Send message to the selected user
    const sendMessage = async (messageData) => {
        if (!selectedUser) return;

        try {
            const { data } = await axios.post(
                `/api/messages/send/${selectedUser._id}`,
                messageData
            );
            if (data.success) {
                setMessages((prevMessages) => [...prevMessages, data.newMessage]);
            } else {
                toast.error(data.message || "Failed to send message");
            }
        } catch (error) {
            toast.error(error.message);
        }
    };

    // Subscribe to incoming messages
    const subscribeToMessages = () => {
        if (!socket) return;

        socket.on("newMessage", (newMessage) => {
            if (selectedUser && newMessage.senderId === selectedUser._id) {
                // If the message is from the selected user, mark it as seen
                newMessage.seen = true;
                setMessages((prevMessages) => [...prevMessages, newMessage]);
                axios.put(`/api/messages/mark/${newMessage._id}`);
            } else {
                // Update unseen messages if the message is from another user
                setUnseenMessages((prevUnseenMessages) => ({
                    ...prevUnseenMessages,
                    [newMessage.senderId]: prevUnseenMessages[newMessage.senderId]
                        ? prevUnseenMessages[newMessage.senderId] + 1
                        : 1,
                }));
            }
        });
    };

    // Unsubscribe from messages when the component unmounts or when the selected user changes
    const unSubscribeFromMessages = () => {
        if (socket) socket.off("newMessage");
    };

    useEffect(() => {
        // Subscribe to messages when socket is ready
        subscribeToMessages();
        
        // Fetch messages for the selected user immediately when the user is selected
        if (selectedUser) {
            getMessages(selectedUser._id);
        }

        return () => {
            // Clean up the socket event when the component unmounts or user changes
            unSubscribeFromMessages();
        };
    }, [socket, selectedUser]);

    useEffect(() => {
        // Fetch users list when the component mounts
        getUsers();
    }, []);

    const value = {
        messages,
        users,
        selectedUser,
        getUsers,
        setMessages,
        sendMessage,
        setSelectedUser,
        unseenMessages,
        setUnseenMessages,
        getMessages
    };

    return (
        <ChatContext.Provider value={value}>
            {children}
        </ChatContext.Provider>
    );
};
