const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");
// const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const express = require("express");
const Product = require("../models/Product");
const router = express.Router();
require("dotenv").config();

const stripe = require("stripe")(
  "sk_test_51QkQtc04gROXO8AyM4WV2iPMQLn6KE1eEzOYtWt8xfKqT1Wk1lSuJEFxI8FSyXTN8gYmHHLLBKZhJIjIxM5GTMK500z0EiP2ly"
);

// Debug logging for Cloudinary config
console.log("Starting Cloudinary configuration...");
console.log("Environment variables present:", {
  cloud_name: !!process.env.CLOUDINARY_CLOUD_NAME,
  api_key: !!process.env.CLOUDINARY_API_KEY,
  api_secret: !!process.env.CLOUDINARY_API_SECRET,
});

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "dbs2aceeu",
  api_key: process.env.CLOUDINARY_API_KEY || "436145576797981",
  api_secret:
    process.env.CLOUDINARY_API_SECRET || "7quyh76MYhorrh5DabG-vcWm0lI",
});

// Verify configuration
console.log(
  "Cloudinary configured with cloud_name:",
  cloudinary.config().cloud_name
);

// Configure multer to use Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "products",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [
      {
        width: 800,
        height: 800,
        crop: "auto",
        gravity: "auto",
        fetch_format: "auto",
        quality: "auto",
      },
    ],
  },
});

// Configure multer to use Cloudinary

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Get all products
router.get("/", async (req, res) => {
  try {
    const products = await Product.find({});
    res.json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ message: error.message });
  }
});

// Create a new product with image upload
router.post(
  "/",
  upload.fields([
    { name: "mainImage", maxCount: 1 },
    { name: "sideImages", maxCount: 3 },
  ]),
  async (req, res) => {
    try {
      if (!req.files.mainImage || !req.files.sideImages) {
        return res.status(400).json({ message: "All images required" });
      }

      const product = new Product({
        title: req.body.title,
        price: req.body.price,
        category: req.body.category,
        description: req.body.description,
        images: {
          main: req.files.mainImage[0].path,
          side: req.files.sideImages.map((file) => file.path),
        },
      });

      const savedProduct = await product.save();
      res.status(201).json(savedProduct);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
);

router.post("/create-checkout-session", async (req, res) => {
  try {
    const { amount } = req.body;
    
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'eur',
      automatic_payment_methods: {
        enabled: true,
      },
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single product
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.json(product);
  } catch (error) {
    console.error("Error fetching single product:", error);
    res.status(500).json({ message: error.message });
  }
});

// Update product
router.put("/:id", upload.single("image"), async (req, res) => {
  try {
    console.log("Update request received for product:", req.params.id);
    console.log("Update data:", req.body);

    const { title, price, category, description } = req.body;
    const updateData = { title, price, category, description };

    if (req.file) {
      console.log("New image file received:", req.file);
      updateData.imageUrl = req.file.path;

      const product = await Product.findById(req.params.id);
      if (product && product.imageUrl) {
        const publicId = product.imageUrl.split("/").slice(-1)[0].split(".")[0];
        console.log("Deleting old image with public ID:", publicId);
        await cloudinary.uploader.destroy(publicId);
      }
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    console.log("Product updated successfully:", updatedProduct);
    res.json(updatedProduct);
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(400).json({ message: error.message });
  }
});

// Delete product
router.delete("/:id", async (req, res) => {
  try {
    console.log("Delete request received for product:", req.params.id);

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (product.imageUrl) {
      const publicId = product.imageUrl.split("/").slice(-1)[0].split(".")[0];
      console.log("Deleting image with public ID:", publicId);
      await cloudinary.uploader.destroy(publicId);
    }

    await Product.findByIdAndDelete(req.params.id);
    console.log("Product deleted successfully");
    res.json({ message: "Product deleted" });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;