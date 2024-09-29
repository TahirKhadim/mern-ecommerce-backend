import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import mongoose from "mongoose";
import { Category } from "../models/category.model.js";

const addCategory = asyncHandler(async (req, res) => {
  try {
    // Extract data from req.body
    const { name, description, parentCategory } = req.body;
    console.log(req.body);

    // Check for required fields
    if (!(name && description)) {
      throw new apiError(400, "All fields are required");
    }

    // Check if category already exists
    const existingCategory = await Category.findOne({ name });
    if (existingCategory) {
      throw new apiError(409, "A category with this name already exists");
    }

    // Check for avatar/image in request files
    if (!req.files || !req.files.image || req.files.image.length === 0) {
      throw new apiError(400, "Category image is required");
    }
    console.log(req.files);

    // Upload image to Cloudinary
    const catImagePath = req.files.image[0].path;
    const image = await uploadOnCloudinary(catImagePath).catch((err) => {
      throw new apiError(400, "Category image upload failed: " + err.message);
    });

    let parentCategoryId = null;
    if (parentCategory) {
      // Check if it's a valid ObjectId
      if (!mongoose.Types.ObjectId.isValid(parentCategory)) {
        throw new apiError(400, "Invalid parentCategory ID");
      }
      parentCategoryId = parentCategory; // Assign the valid ObjectId
    }

    // Create a new category
    const newCategory = await Category.create({
      name,
      description,
      image: image.url,
      parentCategory: parentCategoryId,
    });

    // Respond with the created category
    return res.status(201).json({
      success: true,
      message: "Category created successfully",
      category: newCategory,
    });
  } catch (error) {
    // Use the apiError class for error handling
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
});

const getAllcategory = asyncHandler(async (req, res) => {
  try {
    const category = await Category.find({});

    if (!category) {
      throw new apiError(409, "no data found in category");
    }

    return res.status(201).json({
      success: true,
      message: "Categories fetched successfully",
      category: category,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
});

const deleteCategory = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;

        // Validate the ObjectId
        if (!mongoose.Types.ObjectId.isValid(id)) {
            throw new apiError(404, "Invalid category ID");
        }

        // Find the category
        const category = await Category.findById(id);
        if (!category) {
            throw new apiError(404, "Category not found");
        }

        // Delete the category
        await category.deleteOne();

        return res.status(204).json({
            success: true,
            message: "Category deleted successfully",
        });
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Internal server error",
        });
    }
});
const updateCategory = asyncHandler(async (req, res) => {
    try {
      const { id } = req.params;
  
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new apiError(404, "Invalid category ID");
      }
  
      const category = await Category.findById(id);
      if (!category) {
        throw new apiError(404, "Category not found");
      }
  
      const { name, description, parentCategory } = req.body;
      if (!name || !description) {
        throw new apiError(400, "All fields are required");
      }
  
      let imageurl = category.image;
  
      if (req.files?.image?.[0]?.path) {
        const imagelocalpath = req.files.image[0].path;
        const uploadedImage = await uploadOnCloudinary(imagelocalpath);
        if (!uploadedImage) {
          throw new apiError(500, "Image upload failed");
        }
        imageurl = uploadedImage.url;
      }
  
      const updatedCategory = await Category.findByIdAndUpdate(id, {
        $set: {
          name: name.trim(),
          description: description.trim(),
          image: imageurl,
          parentCategory: parentCategory ? new mongoose.Types.ObjectId(parentCategory) : null, // Ensure parentCategory is an ObjectId
        }
      }, { new: true });
  
      return res.status(200).json({
        success: true,
        message: "Category updated successfully",
        category: updatedCategory,
      });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  });

export { addCategory,getAllcategory,deleteCategory,updateCategory };
