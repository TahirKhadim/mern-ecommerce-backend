import { User } from "../models/user.model.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import mongoose from "mongoose";
import { sendVerificationEmail } from "../utils/email.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefereshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accesstoken = user.generateaccesstoken();

    const refreshtoken = user.generaterefreshtoken();

    user.refreshtoken = refreshtoken;
    await user.save({ validateBeforeSave: false });

    return { accesstoken, refreshtoken };
  } catch (error) {
    throw new apiError(
      500,
      "Something went wrong while generating referesh and access token"
    );
  }
};

// steps for register user
// get data from req.body
// check for empty for data *
// check username or email already exist or not*
// handling image and files

// save data in db

const Register = asyncHandler(async (req, res) => {
  const { username, email, fullname, password, isAdmin } = req.body;

  // Validate required fields
  if ([username, email, fullname, password].some((field) => !field?.trim())) {
    throw new apiError(400, "All fields are required");
  }

  // Check for existing users
  const existingUser = await User.findOne({ $or: [{ email }, { username }] });

  let verifyCode = Math.floor(100000 + Math.random() * 900000); // Generate the verification code

  // Handle existing user logic
  if (existingUser) {
    if (!existingUser.isVerified) {
      existingUser.verifyCode = verifyCode;
      existingUser.verifyCodeExpiry = new Date(Date.now() + 86400000);
      await existingUser.save();
      await sendVerificationEmail(existingUser.email, verifyCode);
      return res
        .status(200)
        .json(
          new apiResponse(200, null, "Verification code sent to your email")
        );
    } else {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Email or username already exists"));
    }
  }

  // Handle image uploads
  if (!req.files || !req.files.avatar || req.files.avatar.length === 0) {
    throw new apiError(400, "Avatar is required");
  }

  const avatarlocalpath = req.files.avatar[0].path;
  const coverimagelocalpath = req.files.coverimage
    ? req.files.coverimage[0]?.path
    : null;

  const avatar = await uploadOnCloudinary(avatarlocalpath).catch((err) => {
    throw new apiError(400, "Avatar upload failed: " + err.message);
  });

  const coverimage = coverimagelocalpath
    ? await uploadOnCloudinary(coverimagelocalpath).catch((err) => {
        throw new apiError(400, "Cover image upload failed: " + err.message);
      })
    : null;

  // Create new user
  const newUser = await User.create({
    fullname,
    username: username.toLowerCase(),
    password,
    email,
    avatar: avatar.url,
    coverimage: coverimage?.url || "",
    verifyCode,
    verifyCodeExpiry: new Date(Date.now() + 86400000),
    isAdmin: isAdmin || false,
  });

  await sendVerificationEmail(newUser.email, verifyCode);

  const createdUser = await User.findById(newUser._id).select(
    "-password -refreshtoken"
  );

  if (!createdUser) {
    throw new apiError(400, "User not created");
  }

  return res
    .status(200)
    .json(
      new apiResponse(
        200,
        createdUser,
        "User registered successfully. Verification code sent to your email."
      )
    );
});

const verifyUser = asyncHandler(async (req, res) => {
  const { verifyCode } = req.body;

  // Find the user by the verification code
  const user = await User.findOne({ verifyCode });
  if (!user) {
    throw new apiError(404, "Invalid verification code or user not found");
  }

  // Check if verification code is correct and not expired
  if (user.verifyCodeExpiry < Date.now()) {
    throw new apiError(400, "Invalid or expired verification code");
  }

  // Update user status to verified
  user.isVerified = true;
  user.verifyCode = undefined; // Clear the verification code
  user.verifyCodeExpiry = undefined; // Clear the expiry time
  await user.save();

  return res.status(200).json(new apiResponse(200, {}, "User verified successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  try {
    const { username, password } = req.body;

    console.log(req.body)

    if (!username || !password) {
      throw new apiError(400, "Username and password are required");
    }

    const user = await User.findOne({ username });
    if (!user) {
      throw new apiError(404, "User not found");
    }

    if (!user.isVerified) {
      throw new apiError(400, "Verification needed before signing in");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);
    if (!isPasswordValid) {
      throw new apiError(400, "Invalid password");
    }

    const accesstoken = user.generateaccesstoken();
    const refreshtoken = user.generaterefreshtoken();

    user.refreshtoken = refreshtoken;
    await user.save({ validateBeforeSave: false });

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      // Use secure cookies in production

      sameSite: "Strict", // Prevents sending cookies in cross-site requests
    };

    return res
      .status(200)
      .cookie("accesstoken", accesstoken, cookieOptions)
      .json({
        success: true,
        message: "Login successful",
        accesstoken,
        refreshtoken,
        user: {
          _id: user._id,
          fullname: user.fullname,
          username: user.username,
          email: user.email,
          // Add other user fields as necessary
        },
      });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

const logoutuser = asyncHandler(async (req, res) => {
  console.log("User ID for logout:", req.user._id); // Check if req.user is populated

  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshtoken: 1,
      },
    },
    { new: true }
  );

  const option = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // Adjust based on environment
  };

  return res
    .status(200)
    .clearCookie("accesstoken", option) // Clear accessToken
    .clearCookie("refreshtoken", option) // Clear refreshToken
    .json(new apiResponse(200, {}, "Logout successful"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new apiError(401, "unauthorized request");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new apiError(401, "Invalid refresh token");
    }

    if (incomingRefreshToken !== user?.refreshtoken) {
      throw new apiError(401, "Refresh token is expired or used");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, newRefreshToken } =
      await generateAccessAndRefereshTokens(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new apiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access token refreshed"
        )
      );
  } catch (error) {
    throw new apiError(401, error?.message || "Invalid refresh token");
  }
});

const getCurrentUser = asyncHandler(async (req, res) => {
  const userId = new mongoose.Types.ObjectId(req.user._id);

  // Fetch user from the database (assuming a User model)
  const user = await User.findById(userId).select(
    "username fullname email avatar coverimage"
  ); // Add fields as needed

  return res
    .status(200)
    .json(new apiResponse(200, user, "User retrieved successfully"));
});

const getAllUser = asyncHandler(async (req, res) => {
  

  // Fetch user from the database (assuming a User model)
  const user = await User.find({})
  return res
    .status(200)
    .json(new apiResponse(200, user, "User retrieved successfully"));
});

const changePassword = asyncHandler(async (req, res) => {
  const { oldpassword, newPassword } = req.body;

  if (!oldpassword || !newPassword) {
    throw new apiError(400, "Old password and new password are required");
  }

  // Fetch the user
  const user = await User.findById(req.user?._id);
  if (!user) {
    throw new apiError(404, "User not found");
  }

  // Check if the old password is correct
  const isPasswordCorrect = await user.isPasswordCorrect(oldpassword);
  if (!isPasswordCorrect) {
    throw new apiError(400, "Invalid old password");
  }

  // Validate the new password
  if (newPassword.length < 6) {
    throw new apiError(400, "New password must be at least 6 characters long");
  }

  // Update and hash the new password
  user.password = newPassword; // Ensure this method hashes the password
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new apiResponse(200, {}, "Password updated successfully"));
});

const updateUserInfo = asyncHandler(async (req, res) => {
  const { username, email, fullname } = req.body;
  console.log(req.body);
  // Check if any field is empty
  if (
    [username, email, fullname].some((field) => !field || field.trim() === "")
  ) {
    throw new apiError(400, "All fields are required");
  }

  // Update user info in the database
  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    {
      username,
      fullname,
      email,
    },
    { new: true, select: "-password -refreshtoken" } // Select new document and exclude password
  );

  if (!updatedUser) {
    throw new apiError(404, "User not found");
  }

  return res
    .status(200)
    .json(
      new apiResponse(200, updatedUser, "User information updated successfully")
    );
});

const changeAvatar = asyncHandler(async (req, res) => {
  // Access the file path
  const avatarlocalpath = req.file.path;
  if (!avatarlocalpath) {
    throw new apiError(404, "Image not found");
  }

  // Upload the image to Cloudinary
  const avatar = await uploadOnCloudinary(avatarlocalpath);
  if (!avatar) {
    throw new apiError(400, "Not uploaded on Cloudinary");
  }

  // Find the user by ID and update the avatar URL
  const userId = req.user._id; // Assuming req.user contains the authenticated user's data
  const user = await User.findByIdAndUpdate(
    userId,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true }
  ).select("-password");

  if (!user) {
    throw new apiError(404, "User not found");
  }

  return res
    .status(200)
    .json(new apiResponse(200, user, "Avatar updated successfully!!"));
});

const changecoverimage = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new apiError(400, "No file uploaded");
  }

  const cimagelocalpath = req.file.path; // Directly access req.file.path
  const coverimage = await uploadOnCloudinary(cimagelocalpath);

  if (!coverimage) {
    throw new apiError(400, "Not uploaded to Cloudinary");
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        coverimage: coverimage.url,
      },
    },
    { new: true, select: "-password" } // Ensure `select` is used correctly
  );

  return res
    .status(200)
    .json(new apiResponse(200, user, "Cover image updated successfully!"));
});

export {
  Register,
  loginUser,
  logoutuser,
  getCurrentUser,
  changeAvatar,
  changePassword,
  changecoverimage,
  updateUserInfo,
  refreshAccessToken,
  verifyUser,
  getAllUser
};
