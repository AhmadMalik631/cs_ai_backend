const asyncHandler = require("express-async-handler");
const User = require("../models/userModel");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

//Generate Token Code
const generatetoken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "1d" });
};

//Register User
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  //Validation
  if (!name || !email || !password) {
    res.status(400);
    throw new Error("Please fill in all required feilds");
  }

  //Password lenght
  if (password.length < 6) {
    res.status(400);
    throw new Error("Password must be up to 6 characters");
  }

  //check if email already exists
  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(400);
    throw new Error("This email is already been registered");
  }

  //Create a new User
  const user = await User.create({
    name,
    email,
    password,
  });

  //Generate Token
  const token = generatetoken(user._id);

  //Send HTTP only cookie
  res.cookie("token", token, {
    path: "/",
    httpOnly: true,
    expires: new Date(Date.now() + 1000 * 86400), // 1 day
    sameSite: "none",
    secure: true,
  });

  //Display User Data
  if (user) {
    const { _id, name, email } = user;
    res.status(201).json({
      _id,
      name,
      email,
      token,
    });
  } else {
    res.status(400);
    throw new Error("Invalid user data");
  }
});

//Login User
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Validate Request
  if (!email || !password) {
    res.status(400);
    throw new Error("Please add email and password");
  }

  // check if user exists
  const user = await User.findOne({ email });
  if (!user) {
    res.status(400);
    throw new Error("User not found, please sign up");
  }

  //Check if the passsowrd is Correct
  const passwordIsCorrect = await bcrypt.compare(password, user.password);

  //Generate Token
  const token = generatetoken(user._id);

  //Send HTTP only cookie
  res.cookie("token", token, {
    path: "/",
    httpOnly: true,
    expires: new Date(Date.now() + 1000 * 86400), // 1 day
    sameSite: "none",
    secure: true,
  });

  if (user && passwordIsCorrect) {
    const { _id, name, email, role } = user;
    res.status(200).json({
      _id,
      name,
      email,
      role,
      token,
    });
  } else {
    res.status(400);
    throw new Error("Invalid email or password");
  }
});

// Logout User
const logout = asyncHandler(async (req, res) => {
  res.cookie("token", "", {
    path: "/",
    httpOnly: true,
    expires: new Date(0),
    sameSite: "none",
    secure: true,
  });
  return res.status(200).json({ message: "Successfully Logged Out" });
});

// Get User
const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    const { _id, name, email, role } = user;
    res.status(201).json({
      _id,
      name,
      email,
      role,
    });
  } else {
    res.status(400);
    throw new Error("User Not Found");
  }
});

// Get Login Status
const loginStatus = asyncHandler(async (req, res) => {
  const token = req.cookies.token;
  let cleanedToken = "";

  if (!token) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.json(false);
    }

    const [bearer, token] = authHeader.split(" ");
    // Check if the Authorization header starts with "Bearer" and contains a token
    if (bearer !== "Bearer" || !token) {
      return res.json(false);
    }

    cleanedToken = token.replace(/"/g, ``);
  }

  //Verify Token
  const verified = jwt.verify(token || cleanedToken, process.env.JWT_SECRET);
  if (verified) {
    return res.json(true);
  }

  return res.json(false);
});

// Get All Users (Admin only)
const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find().select("-password").sort("-createdAt");
  res.status(200).json(users);
});

// Create New User (Admin only)
const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role = "user", isActive = true } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error("Please fill in all required fields");
  }

  // Check if user exists
  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(400);
    throw new Error("Email has already been registered");
  }

  // Create user
  const user = await User.create({
    name,
    email,
    password,
    role,
    isActive
  });

  if (user) {
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive
    });
  } else {
    res.status(400);
    throw new Error("Invalid user data");
  }
});

// Update User (Admin only)
const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  const { name, email, password, isActive } = req.body;

  user.name = name || user.name;
  user.email = email || user.email;
  user.isActive = isActive !== undefined ? isActive : user.isActive;

  if (password) {
    user.password = password;
  }

  const updatedUser = await user.save();

  res.status(200).json({
    _id: updatedUser._id,
    name: updatedUser.name,
    email: updatedUser.email,
    role: updatedUser.role,
    isActive: updatedUser.isActive
  });
});

// Delete User (Admin only)
const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  if (user.role === "super_admin") {
    res.status(400);
    throw new Error("Super admin cannot be deleted");
  }

  await user.remove();
  res.status(200).json({ message: "User deleted successfully" });
});

// Change User Role (Admin only)
const changeRole = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  // Prevent changing super_admin role
  if (user.role === "super_admin") {
    res.status(400);
    throw new Error("Super admin role cannot be changed");
  }

  user.role = req.body.role;
  const updatedUser = await user.save();

  res.status(200).json({
    _id: updatedUser._id,
    name: updatedUser.name,
    email: updatedUser.email,
    role: updatedUser.role
  });
});

// Change Password (for super admin)
const changePassword = asyncHandler(async (req, res) => {
  const { newPassword } = req.body;

  if (!newPassword) {
    res.status(400);
    throw new Error("Please provide new password");
  }

  if (newPassword.length < 6) {
    res.status(400);
    throw new Error("New password must be at least 6 characters");
  }

  // Get the current user (should be super admin)
  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  // Hash new password and save
  user.password = newPassword;
  await user.save();

  res.status(200).json({ message: "Password changed successfully" });
});

module.exports = {
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
};