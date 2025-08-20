const User = require("../models/User");
const jwt = require('jsonwebtoken');

// Middleware to protect routes
const ProtectRoute = async (req, res, next) => {
    try {
        // Get token from Authorization header (most common)
        let token = req.headers.authorization;
        
        // Check if token exists
        if (!token) {
            return res.status(401).json({
                success: false,
                message: "No token provided, authorization denied"
            });
        }
        
        // Remove 'Bearer ' prefix if it exists
        if (token.startsWith('Bearer ')) {
            token = token.slice(7); // Remove 'Bearer ' (7 characters)
        }
        
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Find user
        const user = await User.findById(decoded.userId).select("-password");
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }
        
        req.user = user;
        next();
        
    } catch (error) {
        console.log("Auth middleware error:", error);
        
        // Handle specific JWT errors
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: "Invalid token"
            });
        }
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: "Token expired"
            });
        }
        
        return res.status(500).json({
            success: false,
            message: "Server error in authentication"
        });
    }
};

module.exports = ProtectRoute;