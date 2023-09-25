const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const categorySchema = new Schema({
  name: { type: String, required: true },
  examples: { type: Array, required: true },
});

module.exports = mongoose.model("kategorije_kategorija", categorySchema);
