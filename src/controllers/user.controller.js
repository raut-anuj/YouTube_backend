import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"
import { mongoose } from "mongoose";
import log from "console";
import multer from "multer";

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId)

    const accessToken = user.generateAccessToken()
    const refreshToken = user.generateRefreshToken()

    user.refreshToken = refreshToken
    
    await user.save({ validateBeforeSave: false })

    return { accessToken, refreshToken }
  }

  catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating referesh and access token"
    )
  }
}

const registerUser = asyncHandler(async (req, res) => {
  const { fullName, email, username, password } = req.body;

  if (
    [fullName, email, username, password].some(field => !field || field.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new ApiError(400, "Invalid email format");
  }

  const existedUser = await
    User.findOne(
      {
        $or: [
          { username }, { email }
        ]
      });
  if (existedUser) {
    throw new ApiError(409, "Username or email already exists");
  }

  const avatarLocalPath = req.files?.avatar?.[0]?.path;
  //here avatarimage is required so we can directly access it.
  // console.log("avatarLocalPath:", avatarLocalPath);

  // const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

  //here coverimage is optional so we need to check too much here.
  let coverImageLocalPath;
  //phele yh check kre gh ki [ req.file ] aye ha ki nahi, aur phir yh check kre gh ki agar ayi ha toh uske coverImage ha ki nhi.
  if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
    coverImageLocalPath = req.files.coverImage[0].path
  }
  // console.log("coverImageLocalPath:", coverImageLocalPath);  

  //this is necessary to be checked.
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  // Upload avatar to Cloudinary
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Failed to upload profile picture. Please try again.");
  }

  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase()
  })
  console.log(user);

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
    // console.log(createdUser)   
  );

  if (!createdUser) {
    throw new ApiError
      (500,
        "Something went wrong while registering the user")
  }

  return res.status(201).json(
    new ApiResponse
      (200,
        createdUser,
        "User registered Successfully")
  )
});

const loginUser = asyncHandler(async (req, res) => {

  const { email, password } = req.body;
  if (!email) {
    throw new ApiError(400, "Eemail is required");
  }

  const user = await User.findOne({ email });

  if (!user) {
    throw new ApiError(404, "User not found in database.");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Password is incorrect");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);

  const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

   const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser, accessToken, refreshToken
        },
        "User logged in successfully"

      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1
      }
    },
    {
      new: true
    }
  )
  const options = {
    httpOnly: true,
    secure: true
  }

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out"))
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request");
  }
  try {
      const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET);

    const user = await User.findById(decodedToken?._id);
    if (!user) throw new ApiError(401, "Invalid refresh token");

    if (incomingRefreshToken !== user.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or invalid");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);

    const options = {
      httpOnly: true,
      secure: true,
    };

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken },
          "Access token refreshed successfully"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body

  const user = await User.findById(req.user?._id)

  if (!user) {
    throw new ApiError(404, "User not found in database.");
  }

  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

  if (!isPasswordCorrect) {
    throw new ApiError(400, "invalid old password")
  }
  user.password = newPassword
  await user.save({ validateBeforeSave: false })

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"))

});

const getCurrentuser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(
      200, req.user,
      "current user fetched"
    ))
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body

  if (!fullName || !email) {
    throw new ApiError(400, "All fields are required")
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName: fullName,
        email: email
      }
    },
    { new: true }
  ).select("-password")

  return res
    .status(200)
    .json(new ApiResponse(200, user, "account deails updated successfully"))
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path

  if (!avatarLocalPath) {
    throw new ApiError(404, "Avatar file is missing")
  }
  const avatar = await uploadOnCloudinary(avatarLocalPath)
  if (!avatar.url) {
    throw new ApiError(404, "Error while uploading an Avatar ")
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url
      }
    },
    { new: true }

  ).select("-password")

  return res
    .status(200)
    .json(new ApiResponse(200, user, "account deails updated successfully"))
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path

  if (!coverImageLocalPath) {
    throw new ApiError(404, "Cover image file is missing")
  }
  const coverImage = await uploadOnCloudinary(coverImageLocalPath)
  if (!coverImage.url) {
    throw new ApiError(404, "Error while uploading an coverImage ")
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url
      }
    },
    { new: true }

  ).select("-password")
  return res
    .status(200)
    .json(new ApiResponse(200, user, "account deails updated successfully"))
});

const getWatchHistory = asyncHandler(async (req, res) => {

  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id)
      }
    },
    
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $project: {
              title: 1,
              owner: 1
            }
          },
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullName: 1,
                    username: 1,
                    avatar: 1
                  }
                }
              ]
            }
          },
          {
            $addFields: {
              owner: {
                $first: "$owner"
              }
            }
          }
        ]
      }
    }
  ])
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user[0].watchHistory,
        "Watch history fetched successfully"
      )
    )
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  generateAccessAndRefreshToken,
  changeCurrentPassword,
  getCurrentuser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getWatchHistory
}
