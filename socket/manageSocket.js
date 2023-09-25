const Game = require("../model/Game");
const User = require("../model/User");
const Category = require("../model/Category");

const manageSocket = async (socket) => {
  const { user } = socket.handshake.query;

  socket.on("rejoin-user", ({ socketID }) => {
    socket.join(socketID);
  });
  socket.on("join-user", async ({ id: socketID }) => {
    socket.join(socketID);

    const id = await User.findOne({ username: user }).select("_id").exec();
    const justID = id._id.toString();

    const updatedGame = await Game.findOneAndUpdate(
      { socketID },
      {
        $addToSet: { users: justID },
      },
      { returnOriginal: false }
    );
    socket.server.in(socketID).emit("update-user", {
      user,
      usersNumber: updatedGame.users.length,
    });
    /*Gameplay start */
    if (updatedGame.users.length === updatedGame.usersNumber) {
      /*set random category*/
      const count = await Category.countDocuments();
      const randomIndex = Math.floor(Math.random() * count);

      const randomCategory = await Category.aggregate([
        { $skip: randomIndex },
        { $limit: 1 },
      ]).exec();

      const updatedGame = await Game.findOneAndUpdate(
        { socketID },
        {
          $set: { category: randomCategory[0]._id, isGamePlaying: true },
        },
        { upsert: true, returnOriginal: false }
      );
      /*send data */
      const users = await Game.findOne({ socketID })
        .populate("users")
        .select("users")
        .exec();

      socket.server.in(socketID).emit("game-start", { users });
    }
  });

  socket.on("try", async ({ input, socketID }) => {
    const gameE = await Game.findOne({ socketID }).populate("category");
    input = input.toLowerCase();

    if (
      gameE.category.examples.includes(input) &&
      !gameE.coverdWords.includes(input)
    ) {
      socket.emit("success");
      let l =
        gameE.currentUserIndex === gameE.usersNumber - 1
          ? 0
          : gameE.currentUserIndex + 1;

      const updateGame = await Game.findOneAndUpdate(
        {
          socketID,
        },
        { $set: { currentUserIndex: l }, $push: { coverdWords: input } },
        { returnOriginal: false }
      );

      //console.log(updateGame);

      const data = await Game.findOne({ socketID }).populate([
        "users",
        "category",
      ]);
      socket.server.in(socketID).emit("update-game-data", { data });
    }
  });

  /*LOSE GAME */
  socket.on("lose-game", async ({ socketID, user }) => {
    const id = await User.findOne({ username: user }).select("_id").exec();

    const justID = id._id.toString();

    const gameE = await Game.findOne({ socketID });
    let l =
      gameE.currentUserIndex === gameE.usersNumber - 1
        ? 0
        : gameE.currentUserIndex + 1;
    const updatedGame = await Game.findOneAndUpdate(
      { socketID },
      {
        $pull: {
          users: justID,
        },
        $set: { currentUserIndex: l },
      },
      { returnOriginal: false }
    );
    // const a = await Game.findOneAndUpdate(
    //   { socketID },
    //   { $set: { usersNumber: updatedGame.users.length } }
    // );

    // console.log(a);
    socket.emit("redirect");
    if (updatedGame.users.length === 1) {
      console.log("game end");
    } else if (updatedGame.users.length === 0) {
      const pullCoverdWords = await Game.findOneAndUpdate(
        { socketID },
        {
          $set: {
            coverdWords: [],
            isGamePlaying: false,
          },
        },
        { returnOriginal: false }
      );
    } else {
      const data = await Game.findOne({ socketID: id }).populate([
        "users",
        "category",
      ]);
      socket.server.in(socketID).emit("update-game-data", {});
    }
    console.log(updatedGame);
  });

  /*Leave room*/
  socket.on("leave-room", async ({ socketID, user }) => {
    socket.leave(socketID);

    const id = await User.findOne({ username: user }).select("_id").exec();
    if (!id._id) return;
    const justID = id._id.toString();

    const updatedGame = await Game.findOneAndUpdate(
      { socketID },
      {
        $pull: {
          users: justID,
        },
      },
      { returnOriginal: false }
    );
    //  console.log(updatedGame);

    if (updatedGame.users.length === 1) {
      socket.server.in(socketID).emit("win");
      const updateGame = await Game.findOneAndUpdate(
        { socketID },
        {
          $set: {
            coverdWords: [],
            isGamePlaying: false,
          },
        },
        { returnOriginal: false }
      );
    } else if (updatedGame.users.length === 0) {
      const pullCoverdWords = await Game.findOneAndUpdate(
        { socketID },
        {
          $set: {
            coverdWords: [],
            isGamePlaying: false,
          },
        },
        { returnOriginal: false }
      );
    } else {
      const data = await Game.findOne({ socketID: id }).populate([
        "users",
        "category",
      ]);
      socket.server.in(socketID).emit("update-game-data", { data });
    }
    console.log(updatedGame);
  });
};

module.exports = manageSocket;
