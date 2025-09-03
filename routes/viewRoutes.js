const express = require("express");
const { getAllViews, getView, createView, updateView } = require("../controllers/viewController");
const router = express.Router();

router.post("/create-view", createView)
router.get("/all-views", getAllViews);
router.get("/:id", getView);
router.patch("/update/:id", updateView);

module.exports = router;