const Game = require("../model/Game");

const createGame = async (req, res) => {
  const { name, usersNumber } = req.body;
  if (!name) return res.status(500).json({ message: "Name is required!" });
  try {
    const newGame = await Game.create({
      name,
      usersNumber,
      users: [],
    });
    res.json({ newGame });
  } catch (err) {
    console.log(err.message);
    res.status(500).json({ message: err.message });
  }
};

const getGames = async (req, res) => {
  try {
    const foundGames = await Game.find();

    res.json(foundGames);
  } catch (err) {
    console.log(err.message);
    res.status(500).json({ message: err.message });
  }
};

const getOneGame = async (req, res) => {
  const { id } = req.params;
  //console.log(id);
  if (!id) return res.status(500).json({ message: "ID is required!" });
  try {
    const foundGame = await Game.findOne({ socketID: id })
      .populate(["users", "category"])
      .exec();
    res.json(foundGame);
  } catch (err) {
    console.log(err.message);
    res.status(500).json({ message: err.message });
  }
};

module.exports = { createGame, getGames, getOneGame };
