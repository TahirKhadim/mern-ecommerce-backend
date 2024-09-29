import mongoose from "mongoose";

// Define the Product schema
const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true, // Ensures no duplicate product names
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0, // Ensure price cannot be negative
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category", // Reference to the Category model
      required: true,
    },
    images: [{
      type: String, // Array of image URLs
      trim: true,
    }],
    stock: {
      type: Number,
      required: true,
      min: 0, // Ensure stock cannot be negative
    },
    isActive: {
      type: Boolean,
      default: true, // Indicates if the product is available for sale
    },
 
  },
  { timestamps: true } // Automatically manage createdAt and updatedAt fields
);

// Create the Product model
export const Product = mongoose.model("Product", productSchema);


