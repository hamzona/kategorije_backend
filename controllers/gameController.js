const Game = require("../model/Game");

const createGame = async (req, res) => {
  const { usersNumber, creator } = req.body;
  try {
    const newGame = await Game.create({
      usersNumber,
      users: [],
      creator,
      private: true,
    });
    res.json(newGame);
  } catch (err) {
    console.log(err.message);
    res.status(500).json({ message: err.message });
  }
};

const getGames = async (req, res) => {
  const { creator } = req.body;
  try {
    const foundGames = await Game.find({ private: true, creator });

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

const findGame = async (req, res) => {
  const { usersNumber } = req.body;

  const foundGame = await Game.findOne({
    usersNumber,
    isGamePlaying: false,
    private: false,
  }).exec();
  if (!foundGame) {
    try {
      const newGame = await Game.create({
        name: `Game of ${usersNumber}`,
        usersNumber,
        users: [],
      });
      console.log("New");
      return res.json(newGame);
    } catch (err) {
      console.log(err.message);
      res.status(500).json({ message: err.message });
    }
  } else {
    res.json(foundGame);
  }
};

module.exports = { createGame, getGames, getOneGame, findGame };
