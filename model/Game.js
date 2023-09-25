const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const { v4 } = require("uuid");
const userSchema = new Schema({
  name: { type: String, required: true },
  socketID: {
    type: String,
    default: () => {
      return v4();
    },
  },
  usersNumber: { type: Number, default: 2 },
  category: {
    type: Schema.ObjectId,
    ref: "kategorije_kategorija",
  },
  coverdWords: { type: Array },
  isGamePlaying: { type: Boolean, default: false },
  currentUserIndex: { type: Number, default: 0 },

  users: [
    {
      type: Schema.ObjectId,
      ref: "kategorije_user",
    },
  ],
});

module.exports = mongoose.model("kategorije_game", userSchema);
