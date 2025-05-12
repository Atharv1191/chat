
const express = require("express");
const { signUp, Login, updateProfile, checkAuth } = require("../controllers/UserController");
const ProtectRoute = require("../middelewere/auth");

const router = express.Router()

router.post('/signup',signUp);
router.post('/login',Login);
router.put('/update-profile',ProtectRoute,updateProfile);
router.get('/check',ProtectRoute,checkAuth)
module.exports = router;

