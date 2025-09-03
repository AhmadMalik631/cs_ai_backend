const View = require("../models/View");

// 1. Create a new View
const createView = async (req, res, next) => {
  try {
    const { name, tickets } = req.body;

    const newView = new View({
      name,
      tickets: Array.isArray(tickets) ? tickets : [],
    });

    const savedView = await newView.save();
    res.status(201).json({ message: "View created successfully", data: savedView });
  } catch (err) {
    next(err);
  }
};

// 2. Get all view names (without ticket data)
const getAllViews = async (req, res, next) => {
  try {
    const views = await View.find();
    res.status(200).json({ message: "View names fetched", data: views });
  } catch (err) {
    next(err);
  }
};

// 3. Get full view with populated ticket data
const getView = async (req, res, next) => {
  try {
    const { id } = req.params;

    let sortOption = { date: -1 };

    if (req.query.query) {
      const parsedQuery = JSON.parse(req.query.query);

      if (parsedQuery.sort) {
        sortOption = parsedQuery.sort;
      }
    }

    const view = await View.findById(id).populate({
      path: "tickets",
      options: {
        sort: sortOption,
      },
    });

    if (!view) return res.status(404).json({ message: "View not found" });

    res.status(200).json({ message: "View fetched", data: view });
  } catch (err) {
    next(err);
  }
};

// 4. Update an existing View
const updateView = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const updatedView = await View.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    }).populate("tickets");

    if (!updatedView) {
      return res.status(404).json({ message: "View not found" });
    }

    res.status(200).json({ message: "View updated successfully", data: updatedView });
  } catch (err) {
    next(err);
  }
};

module.exports = { createView, getAllViews, getView, updateView };
