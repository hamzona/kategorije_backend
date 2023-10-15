const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const { v4 } = require("uuid");
const userSchema = new Schema({
  socketID: {
    type: String,
    default: () => {
      return v4().toString().replace("-", "").substring(0, 6);
    },
  },
  createor: { type: String },
  private: { type: Boolean, default: false },
  usersNumber: { type: Number, default: 2 },
  category: {
    type: Schema.ObjectId,
    ref: "kategorije_kategorija",
  },
  coverdWords: {
    type: Array,
  },
  wrongExamples: { type: Array },
  isGamePlaying: { type: Boolean, default: false },
  currentUserIndex: { type: Number, default: 0 },
  coverdCategories: { type: Array },
  users: [
    {
      type: Schema.ObjectId,
      ref: "kategorije_user",
    },
  ],
  interval: {
    duration: { type: Number, default: 30 },
    clear: {
      type: Boolean,
      default: false,
    },
    intervalTime: {
      type: Number,
      default: 1000,
    },
  },
});

module.exports = mongoose.model("kategorije_game", userSchema);
