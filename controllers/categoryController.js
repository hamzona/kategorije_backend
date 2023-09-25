const Category = require("../model/Category");

const getRandomCategories = async (req, res) => {
  try {
    const count = await Category.countDocuments();
    const randomIndex = Math.floor(Math.random() * count);

    const randomDocument = await Category.aggregate([
      { $skip: randomIndex },
      { $limit: 1 },
    ]).exec();

    res.json(randomDocument);
  } catch (err) {
    console.log(err.message);
    res.status(500).json({ message: err.message });
  }
};

const addCategory = async (req, res) => {
  const { name, examples } = req.body;

  try {
    const newCategory = await Category.create({
      name,
      examples,
    });

    res.json(newCategory);
  } catch (err) {
    console.log(err.message);
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getRandomCategories, addCategory };
