const express = require("express");
const router = express.Router();
const gameController = require("../../controllers/gameController");

router.post("/createGame", gameController.createGame);
router.get("/getGames", gameController.getGames);
router.get("/getGame/:id", gameController.getOneGame);
module.exports = router;
