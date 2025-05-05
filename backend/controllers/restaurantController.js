const mongoose = require("mongoose");
const { uploadImageToS3 } = require("../services/s3Service");

const ReplySchema = new mongoose.Schema({
  reply: String,
  user: String,
  createdAt: { type: Date, default: Date.now },
});

const ThreadSchema = new mongoose.Schema({
  post: String,
  user: String,
  imageUrl: String,
  replies: [ReplySchema],
  createdAt: { type: Date, default: Date.now },
});

if (!mongoose.models.Restaurant) {
  const RestaurantSchema = new mongoose.Schema({
    name: String,
    overview: String,
    menuPhotos: [String],
    location: String,
    priceRange: String,
    cuisine: String,
    menu: [String],
    threads: [ThreadSchema],
  });

  mongoose.model("Restaurant", RestaurantSchema);
}

const RestaurantModel = mongoose.model("Restaurant");

const addRestaurant = async (req, res) => {
  try {
    const { name, overview, location, priceRange, cuisine } = req.body;
    const menuPhotos = req.body.menuPhotos || [];

    const newRestaurant = new RestaurantModel({
      name,
      overview,
      menuPhotos,
      location,
      priceRange,
      cuisine,
      menu: [],
      threads: [],
    });

    await newRestaurant.save();
    res.status(201).json({ message: "Restaurant added", restaurant: newRestaurant });
  } catch (err) {
    res.status(500).json({ message: "Error adding restaurant", error: err.message });
  }
};

const getRestaurants = async (req, res) => {
  try {
    const restaurants = await RestaurantModel.find();
    res.json(restaurants);
  } catch (err) {
    res.status(500).json({ message: "Error fetching restaurants", error: err.message });
  }
};

const getRestaurantById = async (req, res) => {
  try {
    const restaurant = await RestaurantModel.findById(req.params.id);
    if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });
    res.json(restaurant);
  } catch (err) {
    res.status(500).json({ message: "Error fetching restaurant", error: err.message });
  }
};

const getThreads = async (req, res) => {
  try {
    const restaurant = await RestaurantModel.findById(req.params.id);
    if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });
    res.json(restaurant.threads || []);
  } catch (err) {
    res.status(500).json({ message: "Error fetching threads", error: err.message });
  }
};

const addThread = async (req, res) => {
  try {
    const { post, user } = req.body;
    const restaurant = await RestaurantModel.findById(req.params.id);
    if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });

    let imageUrl = null;
    if (req.file) {
      const result = await uploadImageToS3(req.file);
      imageUrl = result.Location;
    }

    const newThread = {
      post,
      user,
      imageUrl,
      replies: [],
    };

    restaurant.threads.unshift(newThread);
    await restaurant.save();
    res.status(201).json(restaurant.threads[0]);
  } catch (err) {
    res.status(500).json({ message: "Error adding thread", error: err.message });
  }
};

const addReply = async (req, res) => {
  try {
    const { reply, user } = req.body;
    const restaurant = await RestaurantModel.findById(req.params.id);
    if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });

    const thread = restaurant.threads.id(req.params.threadId);
    if (!thread) return res.status(404).json({ message: "Thread not found" });

    const newReply = { reply, user };
    thread.replies.push(newReply);

    await restaurant.save();
    res.status(201).json(newReply);
  } catch (err) {
    res.status(500).json({ message: "Error adding reply", error: err.message });
  }
};

// ✅ THIS IS THE MOST IMPORTANT PART
module.exports = {
  addRestaurant,
  getRestaurants,
  getRestaurantById,
  getThreads,
  addThread,
  addReply,
};
