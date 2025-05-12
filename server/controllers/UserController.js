const cloudinary = require("../lib/Cloudinary"); // No destructuring needed
const generateToken = require("../lib/utils");
const User = require("../models/User");
const bcrypt = require("bcryptjs");

// Signup a new user
const signUp = async (req, res) => {
    const { fullName, email, password, bio } = req.body;

    try {
        if (!fullName || !email || !password || !bio) {
            return res.status(400).json({
                success: false,
                message: "Missing details",
            });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "Account already exists",
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await User.create({
            fullName,
            email,
            password: hashedPassword,
            bio,
        });

        const token = generateToken(newUser._id);
        return res.status(200).json({
            success: true,
            userData: newUser,
            token,
            message: "Account created successfully",
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// Login a user
const Login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        const isPasswordCorrect = await bcrypt.compare(password, user.password);
        if (!isPasswordCorrect) {
            return res.status(400).json({
                success: false,
                message: "Invalid credentials",
            });
        }

        const token = generateToken(user._id);
        return res.status(200).json({
            success: true,
            userData: user,
            token,
            message: "Login successful",
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// Check if user is authenticated
const checkAuth = async (req, res) => {
    return res.status(200).json({
        success: true,
        user: req.user,
    });
};

// Update user profile
const updateProfile = async (req, res) => {
    try {
        const { profilePic, bio, fullName } = req.body;
        const userId = req.user._id;

        let updatedUser;

        if (!profilePic) {
            updatedUser = await User.findByIdAndUpdate(
                userId,
                { bio, fullName },
                { new: true }
            );
        } else {
           const upload = await cloudinary.uploader.upload(profilePic);
           updatedUser = await User.findByIdAndUpdate(userId,{profilePic:upload.secure_url,bio,fullName},{new:true})

        }
        return res.status(200).json({
            success:true,
            user:updatedUser
        })
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports = { signUp, Login, checkAuth, updateProfile };
