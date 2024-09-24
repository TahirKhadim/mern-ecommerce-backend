import mongoose from "mongoose";

// Define the Category schema
const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true, // Ensures no duplicate category names
      trim: true,   // Removes whitespace from both ends
    },
    description: {
      type: String,
      trim: true,
    },
    parentCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category", // Reference to self for subcategories
      default: null,
    },
    image: {
      type: String, // URL for the category image
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true } // Automatically manage createdAt and updatedAt fields
);

// Create the Category model
const Category = mongoose.model("Category", categorySchema);

module.exports = Category;
