const express = require("express");
const { 
    registerUser, 
    loginUser, 
    logout, 
    getUser, 
    loginStatus, 
    getAllUsers,
    createUser,
    updateUser,
    deleteUser,
    changeRole,
    changePassword
} = require("../controllers/userController");
const protect = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminMiddleware");
const router = express.Router();

// Public routes
router.post("/login", loginUser);
router.get("/logout", logout);
router.get("/loginstatus", loginStatus);

// Protected routes
router.get("/getuser", protect, getUser);

// Admin only routes
router.get("/all", protect, adminOnly, getAllUsers);
router.post("/create", protect, adminOnly, createUser);
router.patch("/update/:id", protect, adminOnly, updateUser);
router.delete("/delete/:id", protect, adminOnly, deleteUser);
router.patch("/change-role/:id", protect, adminOnly, changeRole);
router.post("/change-password", protect, adminOnly, changePassword);

// Disable public registration
// router.post("/register", registerUser)

module.exports = router;
