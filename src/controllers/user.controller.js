    //The things we have to do for register user
    //get user details
    //validation- non empty [fullname ,email ,password]
    //check wheter if user already exists-->> checking can be done by the help of username or by email also.
    //check for image and the cover photo avatar
    //if available then upload at to cloudinary ,avatr
    //create user object--> create  entry in db
    //remove password and refresh the token feild from Response
    //check for user creation
    //retuen Response

// res.status(200).json({
//     message:"ok"
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"
import {mongoose} from "mongoose";
import log  from "console";
import multer from "multer";

const generateAccessAndRefreshToken = async(userId) =>{
    try {
        const user = await User.findById(userId)

        //yha pr access token and refresh token generate ho gh.
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        //yha pr user kh refresh token update ho gh.
        user.refreshToken = refreshToken
        //yha pr refresh token save bhi ho gya database mh.
        await user.save({ validateBeforeSave: false })

        return {accessToken, refreshToken}
          } 
          
          catch (error) {
        throw new ApiError(
          500, 
          "Something went wrong while generating referesh and access token"
        )
    }
}
//asynchandler ek higher order function ha ku ki woh ek function ko leta ha as a input and return krta ha ek function ko as an output.
const registerUser = asyncHandler (async (req, res) => {
    const { fullName, email, username, password } = req.body;
    // console.log(req.body.username); // must print the username
    // console.log(req.body); 
    // console.log(req.files);
    if (
      [fullName, email, username, password].some(field => !field || field.trim() === "")
       ) {
        throw new ApiError(400, "All fields are required");
         }
        //this is not an optimum approach to check email.
        //  if(!email.includes("@"))
        //   throw new ApiError("@ in email is missing")
        //  if(!email.includes("."))
        //   throw new ApiError(". is missing")

        //this is one of the best way to check the email.
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          throw new ApiError(400, "Invalid email format");
        }

    const existedUser = await 
    User.findOne(
      { $or: [
        { username }, { email }
      ] 
    });
    if (existedUser) {
        throw new ApiError(409, "Username or email already exists");
    }

    // req.body → [username, fullname, password, email]
    // req.file → [coverImage, avatarImage] ❌ The problem:
    // Using req.body for username, fullname, email, password → ✅ correct 
    //req.file can store ONLY ONE file, Not two Not avatar + cover together
    // If you have two file uploads (avatar and coverImage), you must use [ req.files ] with named fields.
    
    // req.files = the place where Multer keeps the uploaded files for your route.
    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    //here avatarimage is required so we can directly access it.
    // console.log("avatarLocalPath:", avatarLocalPath);
    
    // const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

    //here coverimage is optional so we need to check too much here.
    let coverImageLocalPath;
    //phele yh check kre gh ki [ req.file ] aye ha ki nahi, aur phir yh check kre gh ki agar ayi ha toh uske coverImage ha ki nhi.
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
      coverImageLocalPath=req.files.coverImage[0].path
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
const loginUser=asyncHandler (async(req,res)=>{
    //req body -> data
    //[ username or email ]  base login krna ha.
    //find the user
    //password check
    //access and refresh token
    //send via cookies [access and refresh token]
    //send res. that successfully registered

    const { email, username, password } = req.body;
    if (!username && !email) {
        throw new ApiError(400, "Username or email is must required");}
    //yah hamko [username] find kr doh yah phr hmko [email] find kr doh dono mh sh koi ek.
    //yah koi ek bhi find kr doh lakin alag alag tarika sh find kro.
    // User.findOne( {username} ).
    // User.findOne( {email} ).
    const user = await User.findOne( 
      { $and: [{ username }, { email }] });

      // const user = await User.findOne( 
      // { $or: [{ username }, { email }] });
      if (user) 
        console.log(user);

    if (!user) {
        throw new ApiError(404, "User not found in database.");
    }
      //user yah-> [user (mera wala created user) mera wala user ha].
      //User yah-> [User mongoose wala user ha].

      const isPasswordValid = await user.isPasswordCorrect(password);
    if (!isPasswordValid) {
        throw new ApiError(401, "Password is incorrect");
    }

      //yaha pr accesstoken and refreshtoken destructure kr kh hm leh rhe ha.
      const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);

      //“Go to the database, find the user with this ID, and return their information but remove the password and refreshToken fields.”
      const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

      //iske help sh cookie joh ha, bas server sh change ho sakta ha, frontend sh koi bhi nhi kr sakta ha.
      const options = {
        httpOnly: true,
        secure: true, }; 
      return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                //ho sakta ha ki user koh accesstoken and refreshtoken save krna ho gh anpne pass is liye hm bhej deh th ha.
                //wase toh hm yaha ph cookie kh through bhi bhej deh rhe ha.
                { 
                  user: loggedInUser, accessToken, refreshToken  
                },
                "User logged in successfully"
                 
            )
        );
        console.log("user",loggedInUser);

        //---------------------------OUPUT-----------------------------
// {
//     "statusCode": 200,
//     "data": {
//         "user": {
//             "_id": "694fec5c04b4719871706e67",
//             "username": "anuj",
//             "email": "anuj@gmail.com",
//             "fullName": "Kumar",
//             "avatar": "http://res.cloudinary.com/dgrkbhfe0/image/upload/v1766845530/ypfwvti23a368tzuxr47.png",
//             "coverImage": "http://res.cloudinary.com/dgrkbhfe0/image/upload/v1766845532/nxyasljsb5jaolca4rpi.png",
//             "watchHistory": [],
//             "createdAt": "2025-12-27T14:25:32.908Z",
//             "updatedAt": "2025-12-27T14:37:22.889Z",
//             "__v": 0
//         },
//         "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2OTRmZWM1YzA0YjQ3MTk4NzE3MDZlNjciLCJlbWFpbCI6ImFudWpAZ21haWwuY29tIiwidXNlcm5hbWUiOiJhbnVqIiwiZnVsbE5hbWUiOiJLdW1hciIsImlhdCI6MTc2Njg0NjI0MiwiZXhwIjoxNzY2OTMyNjQyfQ.FFuY1Oabe65iR-pUkPBjlMEO2OQlKbPJ8CeoWNx0YJk",
//         "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2OTRmZWM1YzA0YjQ3MTk4NzE3MDZlNjciLCJpYXQiOjE3NjY4NDYyNDIsImV4cCI6MTc2NzcxMDI0Mn0.Il2uweJCJZByiFq1klpbPDWieGRFYtJ8Qa0qU3EbDso"
//     },
//     "message": "User logged in successfully",
//     "success": true
// }
});
const logoutUser=asyncHandler(async(req,res)=>{
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset:{
        refreshToken:1
      }
    },
    {
      new:true
    }
  )
//yh cookies kh options ha jo hmne login mh bhi use kiye the.
//aur yh yha use krne ha, ku ki jb user logout krta ha, toh cookies koh bhi delete krna ha.
  const options={
    httpOnly:true,
    secure:true
  }
  
  return res
  .status(200)
  .clearCookie("accessToken",options)
  .clearCookie("refreshToken",options)
  .json(new ApiResponse(200,{},"User logged out"))
})
const refreshAccessToken = asyncHandler(async (req, res) => {
    // Get refresh token from [cookies or body]
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized request");
    }
    try {
        // Verify the token
        // agar koi galat token send kiya ha toh user nhi mile gh DB mh, is liye yh check krna jaruri ha.
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET );
            
        const user = await User.findById(decodedToken?._id);
        if (!user) throw new ApiError(401, "Invalid refresh token");

        // Check if the stored refresh token matches
        if (incomingRefreshToken !== user.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or invalid");
        }

        // Generate new tokens
        const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);

        // Cookie options
        const options = {
            httpOnly: true,
            secure: true,
        }; 

        // Send response with new tokens
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

const changeCurrentPassword=asyncHandler(async(req, res)=>{
  const { oldPassword, newPassword }=req.body
  // console.log("Password changed successfully", newPassword);
  
  // const { oldPassword, newPassword, checkpassword }=req.body
  // if(!(checkpassword === newpassword))
    // throw new ApiError(400,"Invalid match of password")

  const user=await User.findById(req.user?._id)
  const isPasswordCorrect=await user.isPasswordCorrect(oldPassword)

  if(!isPasswordCorrect){
    throw new ApiError(400,"invalid old password")
  }
  user.password=newPassword
  await user.save( {validateBeforeSave:false} )

  return res
  .status(200)
  .json(new ApiResponse(200,{},"Password changed successfully"))

})

//getCurrentuser= Tell me which user is logged in right now.
const getCurrentuser=asyncHandler(async(req,res)=>{
  return res
  .status(200)
  .json( new ApiResponse(
      200,req.user,
      "current user fetched"
    ))
})

//yha pr hm email and fullname alaga alag bhi change kr sakte ha jaurri nhi ha ek sath krna.
const updateAccountDetails=asyncHandler(async(req,res)=>{
  const{ fullName , email }=req.body

    if(!fullName || !email){ 
    throw new ApiError(400,"All fields are required")
   }
   const user=await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set:{
        fullName:fullName,
        email:email
        //aisa bhi lkh sakte ha no problem.
        //fullName,
        // email
      }
    },
    { new:true }
  ).select("-password")

  return res
  .status(200)
  .json(new ApiResponse(200,user,"account deails updated successfully"))
})
 
const updateUserAvatar=asyncHandler(async(req,res)=>{
    const avatarLocalPath=req.file?.path

    if(!avatarLocalPath){
      throw new ApiError(404,"Avatar file is missing")
    }
    const avatar=await uploadOnCloudinary(avatarLocalPath)
    if(!avatar.url){
      throw new ApiError(404,"Error while uploading an Avatar ")
    }
    const user=await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set:{
        avatar:avatar.url
      }
    },
    {new:true}

  ).select("-password")

  return res
  .status(200)
  .json(new ApiResponse(200, user ,"account deails updated successfully"))
})

const updateUserCoverImage=asyncHandler(async(req,res)=>{
    const coverImageLocalPath=req.file?.path

    if(!coverImageLocalPath){
      throw new ApiError(404,"Cover image file is missing")
    }
    const coverImage=await uploadOnCloudinary(coverImageLocalPath)
    if(!coverImage.url){
      throw new ApiError(404,"Error while uploading an coverImage ")
    }
    const user=await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set:{
        coverImage:coverImage.url
      }
    },
    {new:true}

  ).select("-password")
  return res
  .status(200)
  .json(new ApiResponse(200,user,"account deails updated successfully"))
})

const getUserChannelProfile=asyncHandler(async(req,res)=>{
  //const { username } = req.params is used to extract values from the URL.eg. we send information(data) from postman in URl, from there it extracts the username value.
  // http://localhost:3000/user/anuj
  // router.get("/user/:username", getUser); 

    const {username}=req.params
    if(!username?.trim()){
      throw new ApiError(400,"Username is not found")
    }
   const channel=await User.aggregate([
    {
      //yha pr user kh name match kiya gya ha...
      //“Find all documents where the username field in the database is exactly equal to the lowercase version of the input username.”
      $match:{
        username:username?.toLowerCase()
      }
    },
    {
      //yha pr channel kh through subscribers count hua ha..
       $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo" }
    },
    {
      $addFields:{
        //This adds a new field called subscribersCount which counts how many people are in the subscribers array
        subscribersCount: {
               $size: "$subscribers"  },

        //This adds another field called channelsSubscribedToCount which counts how many channels this user has subscribed to.
        channelsSubscribedToCount:{
          $size:"$subscribedTo" },
          
          isSubscribed:{
          //- If the current logged-in user’s ID (req.user?._id) is inside the list of subscriber IDs 
          $cond:{
            if:{$in:[req.user?._id,"$subscribers.subscriber"]},
            then:true,
            else:false
          }
        }
      }
    },
//     - subscribersCount → How many people follow this channel
// - channelsSubscribedToCount → How many channels this user follows
// - isSubscribed → Is you (the logged-in user) is one of the followers of this channel?
    {
      //yha hmko kya-kya display krna ha woh hm display kre gh,      bas uska samne 1 likh doh.
     $project: {
                fullName: 1,
                username: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1
    }}
   ])
   if(!channel?.length){
    throw new ApiError(404,"Channel not found")
   }
   return  res
   .status(200)
   .json(
    new ApiResponse(200,channel[0],"User channelFetched successfully")
    // channel[0]
    // Array ka pehla element le raha hai
    // Yahan sirf ek hi element hai (kyunki _id unique hai)
    // Dusra element exist hi nahi karta
   )
})

//yha ph pipelining hua ha video 21 mh sh...agar koi problem hua toh waha sh dekh lena.
const getWatchHistory=asyncHandler(async(req,res)=>{
  const user=await User.aggregate([
    {
      $match:{
        _id:new mongoose.Types.ObjectId(req.user._id)
      }
    },
    {
      $lookup:{
         from :"videos",
         localField:"watchHistory",
         foreignField:"_id",
         as:"watchHistory",
         pipeline:[
          {
      $project: {
        title: 1,
        owner: 1
      }
    },
          {
            $lookup:{
              from :"users",
              localField:"owner",
              foreignField:"_id",
              as:"owner",
              pipeline:[
                {
                  $project:{
                    fullName:1,
                    username:1,
                    avatar:1
                  }
                }
              ]
            }
          },
          // yh wala pipeline array datastructure koh thk krna kh liya ha.
          {
              $addFields:{
                owner:{
                  $first:"$owner"
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
})
//ek ek kr kh check krne kh liya yha [if kh use kr th ha]... lakin yha jayda optimise nhi ha...ku ki bahut sara fields check krna ha toh time lagah gh likhne mh...so for that we use(for that see above the code)
// if(fullName=="")
//     {
//         throw new ApiError(400,"fullname is requuired")
//     }


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

// - ApiError → "Error" (yes, it's used to throw Errors)
// - ApiResponse → "Response" (used to send structured success Responses)


// Postman request
// {
//     "statusCode": 200,
//     "data": {
//         "_id": "69214ba05d5bfa717f8a2990",
//         "username": "knmnd",
//         "email": "d@example.com",
//         "fullName": "aqwedd",
//         "avatar": "http://res.cloudinary.com/dgrkbhfe0/image/upload/v1763789727/cpdwhsvcflqpmss6k0mx.png",
//         "coverImage": "http://res.cloudinary.com/dgrkbhfe0/image/upload/v1763789728/xe908jk6kabde8xr2b6u.png",
//         "createdAt": "2025-11-22T05:35:28.937Z",
//         "updatedAt": "2025-11-22T05:35:28.937Z",
//         "__v": 0
//     },
//     "message": "User registered Successfully"
// } 

//yha ph return nhi use kre gh ku ki yha ph value return hua ha .
// const registerUser=asyncHandler(async(req,res)=>{
//   res.status(200).json({
//     message:"ok"
//   })
// })


//yh bhi ek tarika ha username, emai, password check krna kh lakin yh tora sh lenthy ha...so for that see above the code.
// if(username===""){
//     throw new ApiError(400,"username is required")  
// }
// if(passsword===""){
//     throw new ApiError(400,"password is required")  
// }
// if(email===""){
//     throw new ApiError(400,"email is required")  
// }