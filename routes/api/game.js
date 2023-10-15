const express = require("express");
const router = express.Router();
const gameController = require("../../controllers/gameController");

router.post("/createGame", gameController.createGame);
router.post("/getGames", gameController.getGames);
router.get("/getGame/:id", gameController.getOneGame);
router.post("/findGame", gameController.findGame);
module.exports = router;
