import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import mongoose from "mongoose";
import { Category } from "../models/category.model.js";
import { Product } from "../models/product.model.js";

const createProduct = asyncHandler(async (req, res) => {
   try {
    const { name, description, price, stock, isActive, category } = req.body;

    console.log(req.body);

    // Check if all fields are provided
    if (![name, description, price, stock, isActive, category].every(field => field !== undefined && field !== null && field !== '')) {
        throw new apiError(400, "All fields are required");
    }

    // Check if a product with the same name already exists
    const existingProduct = await Product.findOne({ name });
    if (existingProduct) {
        throw new apiError(409, "A product with this name already exists");
    }

    // Check if image files are provided
    const productLocalPath = req.files?.images[0]?.path;
    if (!productLocalPath) {
        throw new apiError(400, "Image not found");
    }

    // Upload image to Cloudinary
    const image = await uploadOnCloudinary(productLocalPath);
    if (!image) {
        throw new apiError(500, "Image upload to Cloudinary failed");
    }

    // Convert category to ObjectId
    const categoryId =new mongoose.Types.ObjectId(category);

    // Create a new product
    const newProduct = await Product.create({
        name,
        description,
        price,
        stock,
        images: image.url,
        isActive: isActive === 'true', // Convert to boolean
        category: categoryId, // Assign the ObjectId
    });

    console.log(newProduct);

    // Retrieve the created product with category details
    const createdProduct = await Product.aggregate([
        { $match: { _id: newProduct._id } },
        {
            $lookup: {
                from: "categories",
                localField: "category",
                foreignField: "_id",
                as: "categorydetails",
            }
        },
        { $unwind: "$categorydetails" },
        {
            $project: {
                name: 1,
                description: 1,
                price: 1,
                stock: 1,
                images: 1,
                category: {
                    _id: "$categorydetails._id",
                    name: "$categorydetails.name",
                }
            }
        }
    ]);

    // Check if product creation was successful
    if (!createdProduct || createdProduct.length === 0) {
        throw new apiError(404, "Product not created or category details not found");
    }

    // Respond with the created product
    return res.status(201).json(new apiResponse(201, createdProduct, "Product created successfully"));
    
   } catch (error) {
    return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    
   }
});


const getAllProduct = asyncHandler(async (req, res) => {
    try {
        const products = await Product.aggregate([
            {
                $lookup: {
                    from: "categories",
                    localField: "category",
                    foreignField: "_id",
                    as: "categorydetails",
                }
            },
            { $unwind: "$categorydetails" },
            {
                $project: {
                    name: 1,
                    description: 1,
                    price: 1,
                    stock: 1,
                    images: 1,
                    isActive: 1,
                    category: {
                        _id: "$categorydetails._id",
                        name: "$categorydetails.name",
                    }
                }
            }
        ]);

        return res.status(200).json(new apiResponse(200, products, "Products fetched successfully"));
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Internal server error",
        });
    }
});

const deleteProduct = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;

        // Validate the ObjectId
        if (!mongoose.Types.ObjectId.isValid(id)) {
            throw new apiError(400, "Invalid product ID");
        }

        const product = await Product.findById(id);
        if (!product) {
            throw new apiError(404, "Product not found");
        }

        // Delete the product
        await product.deleteOne();

        return res.status(204).json({
            success: true,
            message: "Product deleted successfully",
        });
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Internal server error",
        });
    }
});

const updateProduct = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;

        // Validate the ObjectId
        if (!mongoose.Types.ObjectId.isValid(id)) {
            throw new apiError(400, "Invalid product ID");
        }

        const product = await Product.findById(id);
        if (!product) {
            throw new apiError(404, "Product not found");
        }

        // Update fields
        const { name, description, price, stock, isActive, category } = req.body;

        if (name) product.name = name;
        if (description) product.description = description;
        if (price !== undefined) product.price = price;
        if (stock !== undefined) product.stock = stock;
        if (isActive !== undefined) product.isActive = isActive === 'true';
        if (category) {
            if (!mongoose.Types.ObjectId.isValid(category)) {
                throw new apiError(400, "Invalid category ID");
            }
            product.category = new mongoose.Types.ObjectId(category);
        }

        // Handle image upload if provided
        if (req.files?.images) {
            const productLocalPath = req.files.images[0].path;
            const image = await uploadOnCloudinary(productLocalPath);
            if (!image) {
                throw new apiError(500, "Image upload to Cloudinary failed");
            }
            product.images = image.url; // Update images field
        }

        const updatedProduct = await product.save();

        return res.status(200).json(new apiResponse(200, updatedProduct, "Product updated successfully"));
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Internal server error",
        });
    }
});

const productByCategory = asyncHandler(async (req, res) => {
    try {
        const { categoryId } = req.params;

        // Validate the ObjectId
        if (!mongoose.Types.ObjectId.isValid(categoryId)) {
            throw new apiError(400, "Invalid category ID");
        }

        // Find products by category
        const products = await Product.find({ category: categoryId }).populate("category", "_id name");

        // Check if products exist
        if (!products || products.length === 0) {
            throw new apiError(404, "No products found for this category");
        }

        return res.status(200).json(new apiResponse(200, products, "Products fetched successfully"));
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Internal server error",
        });
    }
});



const productById = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;

        // Validate the ObjectId
        if (!mongoose.Types.ObjectId.isValid(id)) {
            throw new apiError(400, "Invalid product ID");
        }

        // Find product by ID
        const product = await Product.findById(id).populate("category", "_id name");
        
        // Check if product exists
        if (!product) {
            throw new apiError(404, "Product not found");
        }

        return res.status(200).json(new apiResponse(200, product, "Product fetched successfully"));
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Internal server error",
        });
    }
});












export { createProduct,deleteProduct,updateProduct,getAllProduct,productByCategory ,productById};