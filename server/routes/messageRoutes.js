
const express = require("express");
const ProtectRoute = require("../middelewere/auth");
const { getUserForSidebar, getMessages, markMessageAsSeen, sendMessage } = require("../controllers/messageController");

const router = express.Router();
router.get("/users", ProtectRoute, getUserForSidebar);
router.get("/:id", ProtectRoute, getMessages);
router.put("/mark/:id", ProtectRoute, markMessageAsSeen);
router.post("/send/:id",ProtectRoute,sendMessage)
module.exports = router;