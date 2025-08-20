import { createContext, useEffect, useState } from "react";
import axios from 'axios';
import toast from "react-hot-toast";
import { io } from "socket.io-client";

const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(localStorage.getItem("token"));
    const [authUser, setAuthUser] = useState(null);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [socket, setSocket] = useState(null);
    const [isLoading, setIsLoading] = useState(true); // Add loading state

    // Check if user is authenticated
    const checkAuth = async () => {
        try {
            // If no token, user is not authenticated
            if (!token) {
                setIsLoading(false);
                return;
            }

            const { data } = await axios.get("/api/auth/check");
            if (data.success) {
                setAuthUser(data.user);
                connectSocket(data.user);
            }
        } catch (error) {
            // Handle 401 (unauthorized) gracefully - this means user is not authenticated
            if (error.response?.status === 401) {
                // Clear invalid token
                localStorage.removeItem("token");
                setToken(null);
                setAuthUser(null);
                // Remove authorization header
                delete axios.defaults.headers.common["Authorization"];
            } else {
                // Only show error for non-auth related issues
                console.error("Auth check error:", error);
                toast.error("Authentication check failed");
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Login function
    const login = async (state, credentials) => {
        try {
            const { data } = await axios.post(`/api/auth/${state}`, credentials);
            if (data.success) {
                setAuthUser(data.userData);
                connectSocket(data.userData);
                
                // Set Authorization header with Bearer prefix
                axios.defaults.headers.common["Authorization"] = `Bearer ${data.token}`;
                setToken(data.token);
                localStorage.setItem("token", data.token);
                toast.success(data.message);
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            const errorMessage = error.response?.data?.message || error.message || "Login failed";
            toast.error(errorMessage);
        }
    };

    // Logout function
    const logout = () => {
        localStorage.removeItem("token");
        setToken(null);
        setAuthUser(null);
        setOnlineUsers([]);
        
        // Remove Authorization header
        delete axios.defaults.headers.common["Authorization"];
        
        toast.success("Logged out Successfully");
        if (socket) {
            socket.disconnect();
            setSocket(null);
        }
    };

    // Update profile function
    const updateProfile = async (body) => {
        try {
            const { data } = await axios.put("/api/auth/update-profile", body);
            if (data.success) {
                setAuthUser(data.user);
                toast.success("Profile Updated successfully");
            }
        } catch (error) {
            const errorMessage = error.response?.data?.message || error.message || "Profile update failed";
            toast.error(errorMessage);
        }
    };

    // Connect socket function
    const connectSocket = (userData) => {
        if (!userData || socket?.connected) return;

        const newSocket = io(backendUrl, {
            query: {
                userId: userData._id,
            }
        });

        newSocket.connect();
        setSocket(newSocket);

        newSocket.on("getOnlineUsers", (userIds) => {
            setOnlineUsers(userIds);
        });

        // Handle socket connection errors
        newSocket.on("connect_error", (error) => {
            console.error("Socket connection error:", error);
        });
    };

    // Set baseURL and headers when component mounts
    useEffect(() => {
        axios.defaults.baseURL = backendUrl;
        
        // Set Authorization header if token exists
        if (token) {
            axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        }
        
        checkAuth();
    }, []); // Remove token dependency to avoid infinite re-renders

    // Update axios headers when token changes
    useEffect(() => {
        if (token) {
            axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        } else {
            delete axios.defaults.headers.common["Authorization"];
        }
    }, [token]);

    const value = {
        axios,
        authUser,
        onlineUsers,
        socket,
        isLoading, // Expose loading state
        login,
        logout,
        updateProfile
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};