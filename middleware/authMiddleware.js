const asyncHandler = require("express-async-handler");
const User = require("../models/userModel");
const jwt = require("jsonwebtoken");

const protect = asyncHandler(async (req, res, next) => {
  try {
    const token = req.cookies.token;
    let cleanedToken = "";
    if (!token) {
      const authHeader = req.headers.authorization;

      if (!authHeader) {
        res.status(401);
        throw new Error("Not authorized, please login");
      }

      const [bearer, token] = authHeader.split(" ");

      // Check if the Authorization header starts with "Bearer" and contains a token
      if (bearer !== "Bearer" || !token) {
        res.status(401);
        throw new Error("Not authorized, please login");
      }

      cleanedToken = token.replace(/"/g, ``);
    }

    //Validations

    //Verify Token
    const verified = jwt.verify(cleanedToken || token, process.env.JWT_SECRET);

    // Get user id from token
    const user = await User.findById(verified.id).select("-password");
    if (!user) {
      res.status(401);
      throw new Error("User Not Found");
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401);
    throw new Error("Not authorized, please login");
  }
});

module.exports = protect;
