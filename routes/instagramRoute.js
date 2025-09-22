import express from "express";
import {
  authInstagram,
  authCallback,
  fetchMessages,
  replyMessage
} from "../controllers/instagramController.js";

const router = express.Router();

router.get("/instagram", authInstagram);
router.get("/auth/instagram/callback", authCallback);
router.get("/messages", fetchMessages);
router.post("/reply", replyMessage);

export default router;
