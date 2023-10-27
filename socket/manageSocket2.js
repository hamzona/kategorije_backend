const Game = require("../model/Game");
const User = require("../model/User");
const Category = require("../model/Category");

const manageSocket = async (socket) => {
  if (socket.handshake.query.user) {
    await User.findOneAndUpdate(
      { username: socket.handshake.query.user },
      { $set: { online: true } },
      { upsert: true, returnOriginal: false }
    );
  }

  socket.on("disconnect", async () => {
    if (socket.handshake.query.user) {
      await User.findOneAndUpdate(
        { username: socket.handshake.query.user },
        { $set: { online: false } },
        { upsert: true, returnOriginal: false }
      );
    }
  });
  //JOIN USER
  socket.on("join-user", async ({ socketID, user }) => {
    const game = await Game.findOne({ socketID }).populate("users");
    if (game === null) return;

    if (
      game?.isGamePlaying &&
      game?.users?.find((item) => item.username === user)?.username
    ) {
      console.log("rejoining");

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

    //remove players that are not online
    const removeOfflinePlayers = await Game.findOne({ socketID }).populate(
      "users"
    );

    removeOfflinePlayers.users = removeOfflinePlayers.users.filter(
      (user) => user.online !== false
    );
    const onlineUsers = removeOfflinePlayers.users.map((user) => {
      return user._id.toString();
    });

    const finalUsers = await Game.findOneAndUpdate(
      { socketID },
      {
        $set: { users: onlineUsers },
      },
      { returnOriginal: false }
    );

    if (finalUsers.users.length === updatedGame.usersNumber) {
      /*set random category*/

      // console.log("Users");
      // const currentDate = new Date();
      // const updateUsers = await User.updateMany(
      //   { _id: { $in: updatedGame.users } },
      //   {
      //     $set: {
      //       lastGameDate: currentDate,
      //     },
      //   },
      //   { upsert: true, returnOriginal: false }
      // );

      // console.log(updateUsers);
      // updatedGame.users.forEach(async (user) => {
      //   const updateUser = await User.findOneAndUpdate(
      //     {
      //       _id: user,
      //     },
      //     {
      //       $set: {
      //         lastGameDate: currentDate,
      //       },
      //     },
      //     { upsert: true, returnOriginal: false }
      //   );
      //   console.log(updateUser);
      // });

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
            "interval.duration": 15,
          },
          $push: { coverdCategories: randomCategory[0]._id },
        },
        { upsert: true, returnOriginal: false }
      );
      timerPlay({ socketID });
    }

    const data = await Game.findOne({ socketID }).populate("users").exec();
    console.log("update-loby");
    socket.server.in(socketID).emit("update-loby", {
      data,
    });
  });

  function comparingStringWithMistakes({ game, input }) {
    return game.category.examples.find((item) => {
      let mistakes = 0;

      if (
        (item.length >= 5 &&
          item.length - 1 <= input.length &&
          item.length + 1 >= input.length) ||
        (item.length < 5 && item.length === input.length)
      ) {
        for (let i = 0; i < item.length; i++) {
          if (!input[i]) {
            mistakes++;
          } else if (input[i] !== item[i]) {
            mistakes++;
          }
        }
        console.log(item);
        if (mistakes <= 2 && item.length >= 5) {
          if (!game.coverdWords.includes(item)) {
            return item;
          }
        } else if (mistakes <= 1) {
          if (!game.coverdWords.includes(item)) {
            return item;
          }
        }
      }
    });
  }

  //TRY
  socket.on("try", async ({ input, socketID, user }) => {
    const game = await Game.findOne({ socketID }).populate("category");
    input = input.toLowerCase();

    const word = comparingStringWithMistakes({ game, input });
    if (word) {
      let l =
        game.currentUserIndex === game.users.length - 1
          ? 0
          : game.currentUserIndex + 1;

      const updatedGame = await Game.findOneAndUpdate(
        { socketID },
        {
          $set: {
            currentUserIndex: l,
            "interval.clear": true,
            wrongExamples: [],
          },
          $push: {
            coverdWords: word,
          },
        },
        {
          upsert: true,
          returnOriginal: false,
        }
      );

      if (updatedGame.coverdWords.length === game.category.examples.length) {
        const count = await Category.countDocuments();
        const randomIndex = Math.floor(Math.random() * count);

        const randomCategory = await Category.aggregate([
          { $skip: randomIndex },
          { $limit: 1 },
        ]).exec();

        const updatedGame = await Game.findOneAndUpdate(
          { socketID },
          {
            $set: {
              category: randomCategory[0]._id,
              coverdWords: [],
              isGamePlaying: true,
            },

            $push: { coverdCategories: randomCategory[0]._id },
          },
          { upsert: true, returnOriginal: false }
        );
      }
      //console.log(updatedGame);
    } else {
      console.log("wrong try");
      const updatedGame = await Game.findOneAndUpdate(
        { socketID },
        {
          $push: { wrongExamples: input },
        },
        { upsert: true, returnOriginal: false }
      );
      socket.emit("wrong-try", { wrongExamples: updatedGame.wrongExamples });
    }

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
        await Game.findOneAndUpdate(
          { socketID },
          { $set: { "interval.clear": false, "interval.duration": 15 } }
        );

        if (game.isGamePlaying) {
          timerPlay({ socketID });
        }
      } else if (game.interval.duration >= 0) {
        // console.log(game.interval.duration);
        socket.server.in(socketID).emit("timer-update", {
          seconds: game.interval.duration,
        });
        game.interval.duration--;
      } else if (game.interval.duration < 1) {
        clearInterval(intervalID);
        socket.server.in(socketID).emit("redirect", {
          user: game.users[game.currentUserIndex].username,
        });
        removePlayer({
          socketID,
          user: game.users[game.currentUserIndex].username,
        });
      }
      await game.save();
    }, 1000);
  };

  //Remove Player
  const removePlayer = async ({ socketID, user }) => {
    const game = await Game.findOne({ socketID });

    const id = await User.findOne({ username: user }).select("_id").exec();
    const justID = id._id.toString();

    let newIndex =
      game.currentUserIndex >= game.users.length - 2
        ? 0
        : game.currentUserIndex + 1;

    const updatedGame = await Game.findOneAndUpdate(
      { socketID },
      {
        $pull: {
          users: justID,
        },
        $set: {
          currentUserIndex: newIndex,
          "interval.duration": 15,
          "interval.clear": false,
        },
      },
      { returnOriginal: false }
    );
    if (updatedGame.users.length === 0) {
      const deleteGame = await Game.findOneAndDelete({
        socketID,
      });
      console.log("Game deleted");
    } else if (updatedGame.users.length === 1) {
      socket.server.in(socketID).emit("win");
      const updatedGame = await Game.findOneAndUpdate(
        { socketID },
        {
          $set: {
            win: true,
          },
        },
        { returnOriginal: false }
      );
      timerPlay({ socketID });
    } else {
      const data = await Game.findOne({ socketID }).populate([
        "users",
        "category",
      ]);
      timerPlay({ socketID });
      // console.log(data);
      socket.server.in(socketID).emit("update-game-data", { data });
    }
  };
  // LEAVE ROOM
  socket.on("leave-room", async ({ socketID, user }) => {
    const game = await Game.findOne({ socketID });
    if (!game) return;
    if (game.isGamePlaying) {
      return socket.leave(socketID);
    }

    const id = await User.findOne({ username: user }).select("_id").exec();
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

    const data = await Game.findOne({ socketID }).populate("users");
    socket.server.in(socketID).emit("update-user", { data });
  });
};

module.exports = manageSocket;
