const express = require("express");
const router = express.Router();
const categoryController = require("../../controllers/categoryController");

router.post("/add", categoryController.addCategory);
router.get("/getRandom", categoryController.getRandomCategories);

module.exports = router;
