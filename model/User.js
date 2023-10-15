const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userSchema = new Schema({
  username: {
    type: String,
    required: true,
  },

  password: {
    type: String,
    required: true,
  },
  refreshToken: { type: String },
  //lastGameDate: { type: Date },
  online: { type: Boolean },
});

module.exports = mongoose.model("kategorije_user", userSchema);
