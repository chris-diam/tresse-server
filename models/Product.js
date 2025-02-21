const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    price: { type: Number, required: true },
    category: { type: String, required: true },
    description: { type: String, default: "" },
    images: {
      main: { type: String, required: true },
      side: [{ type: String, required: true }],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
