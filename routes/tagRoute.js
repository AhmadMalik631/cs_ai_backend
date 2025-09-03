const express = require("express");
const { createTag, GetAllTags, deleteTag } = require("../controllers/tagsController");
const router = express.Router();

router.post('/create-tag', createTag)
router.get('/get-all-tags', GetAllTags)
router.delete('/delete-tag', deleteTag)


module.exports = router