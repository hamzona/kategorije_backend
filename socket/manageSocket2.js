const Game = require("../model/Game");
const User = require("../model/User");
const Category = require("../model/Category");

const manageSocket = async (socket) => {
  //JOIN USER
  socket.on("join-user", async ({ socketID, user }) => {
    const game = await Game.findOne({ socketID }).populate("users");
    if (game.users.find((item) => item.username === user)?.username) {
      return socket.join(socketID);
    }
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

    if (updatedGame.users.length === updatedGame.usersNumber) {
      /*set random category*/
      const count = await Category.countDocuments();
      const randomIndex = Math.floor(Math.random() * count);

      const randomCategory = await Category.aggregate([
        { $skip: randomIndex },
        { $limit: 1 },
      ]).exec();
      const newUpdatedGame = await Game.findOneAndUpdate(
        { socketID },
        {
          $set: {
            category: randomCategory[0]._id,
            isGamePlaying: true,
            "interval.duration": 30,
          },
          $push: { coverdCategories: randomCategory[0]._id },
        },
        { upsert: true, returnOriginal: false }
      );
      timerPlay({ socketID });
    }

    const data = await Game.findOne({ socketID }).populate("users").exec();
    console.log("update-loby");
    console.log(data);
    socket.server.in(socketID).emit("update-loby", {
      data,
    });
  });
  //TRY
  socket.on("try", async ({ input, socketID, user }) => {
    const game = await Game.findOne({ socketID }).populate("category");
    input = input.toLowerCase();
    if (
      game.category.examples.includes(input) &&
      !game.coverdWords.includes(input)
    ) {
      let l =
        game.currentUserIndex === game.usersNumber - 1
          ? 0
          : game.currentUserIndex + 1;

      const updatedGame = await Game.findOneAndUpdate(
        { socketID },
        {
          $set: {
            currentUserIndex: l,
            "interval.clear": true,
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

      console.log(updatedGame);
    }
    const testGame = await Game.findOne({ socketID }).populate("category");
    if (testGame.coverdWords.length === testGame.category.examples.length) {
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

          $push: { coverdCategories: randomCategory[0]._id },
        },
        { upsert: true, returnOriginal: false }
      );
    }
    // timerPlay({ socketID });
    const data = await Game.findOne({ socketID }).populate([
      "users",
      "category",
    ]);
    socket.server.in(socketID).emit("update-game-data", { data });
  });

  //   //TIMER
  const timerPlay = async ({ socketID }) => {
    const intervalID = setInterval(async () => {
      const game = await Game.findOne({ socketID }).populate("users");
      if (game.interval.clear === true) {
        clearInterval(intervalID);
        game.interval.clear = false;
        game.interval.duration = 30;
        await game.save();

        if (game.isGamePlaying) {
          timerPlay({ socketID });
        }
      } else if (game.interval.duration >= 0) {
        console.log(game.interval.duration);
        socket.server.in(socketID).emit("timer-update", {
          seconds: game.interval.duration,
        });
        game.interval.duration--;
      } else if (game.interval.duration < 1) {
        clearInterval(intervalID);
        socket.server.in(socketID).emit("redirect", {
          user: game.users[game.currentUserIndex].username,
        });
        loseGame({
          socketID,
          user: game.users[game.currentUserIndex].username,
        });
      }
      await game.save();
    }, 1000);
  };

  //LOSE GAME
  const loseGame = async ({ socketID, user }) => {
    const game = await Game.findOne({ socketID });

    socket.leave(socketID);
    const id = await User.findOne({ username: user }).select("_id").exec();
    const justID = id._id.toString();

    let newIndex =
      game.currentUserIndex === game.usersNumber - 1
        ? 0
        : game.currentUserIndex + 1;

    const updatedGame = await Game.findOneAndUpdate(
      { socketID },
      {
        $pull: {
          users: justID,
        },
        $set: { currentUserIndex: newIndex },
      },
      { returnOriginal: false }
    );

    if (updatedGame.users.length <= 1) {
      socket.server.in(socketID).emit("win");

      const resetGame = await Game.findOneAndUpdate(
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
    } else {
      const data = await Game.findOne({ socketID: id }).populate(["users"]);
      timerPlay({ socketID, user });
      socket.server.in(socketID).emit("update-game-data", { data });
    }
  };
  //LEAVE ROOM
  //   socket.on("leave-room", async ({ socketID, user }) => {
  //     const game = await Game.findOne({ socketID });
  //     if (game.isGamePlaying) {
  //       return socket.leave(socketID);
  //     }

  //     const id = await User.findOne({ username: user }).select("_id").exec();
  //     const justID = id._id.toString();

  //     const updatedGame = await Game.findOneAndUpdate(
  //       { socketID },
  //       {
  //         $pull: {
  //           users: justID,
  //         },
  //       },
  //       { returnOriginal: false }
  //     );

  //     const data = await Game.findOne({ socketID }).populate("users");
  //     socket.server.in(socketID).emit("update-user", { data });
  //   });
};

module.exports = manageSocket;
