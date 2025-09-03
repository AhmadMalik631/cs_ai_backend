const express = require("express");
const router = express.Router();
const { fetchTickets, getSingleTicket, updateTicket, mergeTickets, getMergeSuggestions, checkDuplicates, getDuplicateTickets, getTicketDuplicates } = require("../controllers/ticketController.js");

router.patch("/update/:id", updateTicket);
router.get("/fetch-tickets", fetchTickets);
router.post("/merge", mergeTickets);
router.get("/duplicates", getDuplicateTickets);
router.get("/merge-suggestions/:ticketId", getMergeSuggestions);
router.post("/:id/check-duplicates", checkDuplicates);
router.get("/:id/duplicates", getTicketDuplicates);
router.get("/:id", getSingleTicket);

module.exports = router;