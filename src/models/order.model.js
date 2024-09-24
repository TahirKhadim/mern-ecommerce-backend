import mongoose from "mongoose";

// Define the Order schema
const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Reference to the User model
      required: true,
    },
    products: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product", // Reference to the Product model
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1, // Minimum quantity should be 1
        },
        price: {
          type: Number,
          required: true,
          min: 0, // Ensure price cannot be negative
        },
      },
    ],
    totalAmount: {
      type: Number,
      required: true,
      min: 0, // Ensure total amount cannot be negative
    },
    shippingAddress: {
      type: String,
      required: true,
    },
    paymentMethod: {
      type: String,
      required: true,
    },
    orderStatus: {
      type: String,
      enum: ["Pending", "Shipped", "Delivered", "Cancelled"],
      default: "Pending",
    },
   
  },
  { timestamps: true } // Automatically manage createdAt and updatedAt fields
);

// Create the Order model
const Order = mongoose.model("Order", orderSchema);

module.exports = Order;
