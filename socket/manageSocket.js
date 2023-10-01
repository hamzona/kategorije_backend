const Game = require("../model/Game");
const User = require("../model/User");
const Category = require("../model/Category");

const manageSocket = async (socket) => {
  socket.on("rejoin-user", ({ socketID }) => {
    socket.join(socketID);
  });
  socket.on("join-user", async ({ id: socketID, user }) => {
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

    const data = await Game.findOne({ socketID }).populate("users");

    socket.server.in(socketID).emit("update-user", {
      users: data.users,
      usersNumber: data.usersNumber,
    });
    /*Gameplay start */
    if (updatedGame.users.length === updatedGame.usersNumber) {
      /*set random category*/

      // async function a() {
      const count = await Category.countDocuments();
      const randomIndex = Math.floor(Math.random() * count);

      const randomCategory = await Category.aggregate([
        { $skip: randomIndex },
        { $limit: 1 },
      ]).exec();
      // console.log(
      //   updatedGame.coverdCategories.includes(randomCategory[0]._id)
      // );
      // if (updatedGame.coverdCategories.includes(randomCategory[0]._id)) {
      //   return a();
      // // } else {
      const updatedGame = await Game.findOneAndUpdate(
        { socketID },
        {
          $set: { category: randomCategory[0]._id, isGamePlaying: true },

          $push: { coverdCategories: randomCategory[0]._id },
        },
        { upsert: true, returnOriginal: false }
      );
      /*send data */
      const users = await Game.findOne({ socketID })
        .populate("users")
        .select("users")
        .exec();

      socket.server.in(socketID).emit("game-start", { users });
      // }
      // }
      // a();
    }
  });

  socket.on("try", async ({ input, socketID }) => {
    const gameE = await Game.findOne({ socketID }).populate("category");
    input = input.toLowerCase();
    // console.log(gameE.category.name);
    // console.log(gameE.coverdWordsAndCategories);
    console.log(input);
    console.log(gameE.coverdWords.includes(input));

    if (
      gameE.category.examples.includes(input) &&
      !gameE.coverdWords.includes(input)
    ) {
      socket.emit("success");
      let l =
        gameE.currentUserIndex === gameE.usersNumber - 1
          ? 0
          : gameE.currentUserIndex + 1;

      //Update word

      const updatedGame = await Game.findOneAndUpdate(
        { socketID },
        {
          $set: {
            currentUserIndex: l,
          },
          $push: {
            coverdWords: input,
          },
        },
        {
          upsert: true,
          returnOriginal: false,
        }
      );

      //if every word in category is coverd
      if (updatedGame.coverdWords.length === gameE.category.examples.length) {
        // console.log("changing category");
        // async function a() {
        const count = await Category.countDocuments();
        const randomIndex = Math.floor(Math.random() * count);

        const randomCategory = await Category.aggregate([
          { $skip: randomIndex },
          { $limit: 1 },
        ]).exec();

        // console.log("changing category");

        // console.log(
        //   updatedGame.coverdCategories.includes(randomCategory[0]._id)
        // );
        // if (updatedGame.coverdCategories.includes(randomCategory[0]._id)) {
        //   return a();
        // } else {
        const updatedGame = await Game.findOneAndUpdate(
          { socketID },
          {
            $set: { category: randomCategory[0]._id },
            $push: { coverdCategories: randomCategory[0]._id },
          },
          { upsert: true, returnOriginal: false }
        );
        // }
        // }
        // await a();
      }

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
    // if (updatedGame.isGamePlaying) {
    // } else

    if (updatedGame.users.length === 1) {
      socket.server.in(socketID).emit("win");

      const pullCoverdWords = await Game.findOneAndUpdate(
        { socketID },
        {
          $set: {
            coverdWords: [],
            coverdCategories: [],
            isGamePlaying: false,
          },
        },
        { returnOriginal: false }
      );
      console.log(pullCoverdWords);

      // console.log("game end");
    } else if (updatedGame.users.length === 0) {
      const pullCoverdWords = await Game.findOneAndUpdate(
        { socketID },
        {
          $set: {
            coverdWords: [],
            coverdCategories: [],
            isGamePlaying: false,
          },
        },
        { returnOriginal: false }
      );
      console.log(pullCoverdWords);
    } else {
      const data = await Game.findOne({ socketID: id }).populate([
        "users",
        "category",
      ]);
      socket.server.in(socketID).emit("update-game-data", {});
    }
  });

  /*Leave room*/
  socket.on("leave-room", async ({ socketID, user }) => {
    console.log("tringer");
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
    // if (updatedGame.isGamePlaying) {
    //} else

    if (updatedGame.users.length === 1) {
      socket.server.in(socketID).emit("win");
      const pullCoverdWords = await Game.findOneAndUpdate(
        { socketID },
        {
          $set: {
            coverdWords: [],
            coverdCategories: [],
            isGamePlaying: false,
          },
        },
        { returnOriginal: false }
      );
      console.log(pullCoverdWords);
    } else if (updatedGame.users.length === 0) {
      const pullCoverdWords = await Game.findOneAndUpdate(
        { socketID },
        {
          $set: {
            coverdWords: [],
            coverdCategories: [],
            isGamePlaying: false,
          },
        },
        { returnOriginal: false }
      );
      console.log(pullCoverdWords);
    } else {
      const data = await Game.findOne({ socketID: id }).populate([
        "users",
        "category",
      ]);
      socket.server.in(socketID).emit("update-game-data", { data });
    }
  });
};

module.exports = manageSocket;
