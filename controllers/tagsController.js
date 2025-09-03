const Tags = require("../models/Tags");
const asyncHandler = require("express-async-handler");

const createTag = asyncHandler(async (req, res) => {
  const { name } = req.body;

  if (!name) {
    res.status(400);
    throw new Error("Please Enter Tag name");
  }

  const tag = await Tags.create({
    name,
  });

  res.status(201).json({
    tag,
  });
});

const GetAllTags = asyncHandler(async (req, res) => {
  const tags = await Tags.find();

  if (tags.length === 0) {
    res.status(404);
    throw new Error("No Tags available");
  }

  res.status(200).json({
    tags,
  });
});

const deleteTag = asyncHandler(async (req, res) => {
  const { id } = req.body;

  if (!id) {
    res.status(400);
    throw new Error("tag Id not found");
  }

  const result = await Tags.deleteOne({ _id: id });

  if (result.deletedCount === 0) {
    res.status(404);
    throw new Error("Tag not found or already deleted");
  }

  res.status(200).json({ message: "Tag deleted successfully" });
});


module.exports = {
    createTag,
    GetAllTags,
    deleteTag
}
