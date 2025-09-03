const mongoose = require("mongoose");
const { Schema, Types } = mongoose;

const viewSchema = new Schema({
  name: { type: String, required: true }, 
  tickets: [{ type: Types.ObjectId, ref: "Ticket" }], 
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("View", viewSchema);