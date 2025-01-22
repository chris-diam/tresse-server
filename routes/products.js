const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");
const express = require("express");
const Product = require("../models/Product");

const router = express.Router();

// Cloudinary configuration
cloudinary.config({
  cloud_name: 'dbs2aceeu', 
  api_key: '436145576797981',
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure multer to use Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'products',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ 
      width: 800, 
      height: 800, 
      crop: 'auto',
      gravity: 'auto',
      fetch_format: 'auto',
      quality: 'auto'
    }]
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Get all products
router.get("/", async (req, res) => {
  try {
    const products = await Product.find({});
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create a new product with image upload
router.post("/", upload.single("image"), async (req, res) => {
  try {
    const { title, price, category, description } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: "Please upload an image" });
    }

    const product = new Product({
      title,
      price,
      category,
      description,
      imageUrl: req.file.path,
    });

    const savedProduct = await product.save();
    res.status(201).json(savedProduct);
  } catch (error) {
    res.status(400).json({ message: error.message });
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
    res.status(500).json({ message: error.message });
  }
});

// Update product
router.put("/:id", upload.single("image"), async (req, res) => {
  try {
    const { title, price, category, description } = req.body;
    const updateData = { title, price, category, description };

    if (req.file) {
      // If there's a new image, update the imageUrl
      updateData.imageUrl = req.file.path;
      
      // Delete old image from Cloudinary
      const product = await Product.findById(req.params.id);
      if (product && product.imageUrl) {
        const publicId = product.imageUrl.split('/').slice(-1)[0].split('.')[0];
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

    res.json(updatedProduct);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete product
router.delete("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Delete image from Cloudinary
    if (product.imageUrl) {
      const publicId = product.imageUrl.split('/').slice(-1)[0].split('.')[0];
      await cloudinary.uploader.destroy(publicId);
    }

    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: "Product deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;