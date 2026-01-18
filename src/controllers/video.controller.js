import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { log } from "console";
import jwt from "jsonwebtoken";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";
import { User } from "../models/user.model.js";

const UploadVideo = asyncHandler(async(req, res)=>{
    const videoFile = req.file
    const { title, duration } = req.body;

    if(!videoFile)
        throw new ApiError(400, "Video is required.")

    if(!videoFile.mimetype.startsWith("video/"))
        throw new ApiError(400, "Please upload the video");
    
    const MAX_SIZE = 20 * 1024 * 1024
    if(videoFile.size > MAX_SIZE)
        throw new ApiError(400, "Video size must mb less than 20MB");

    if (!title || title.trim() === "")
        throw new ApiError(400, "Title is required");
    if (!duration || duration.trim() === "")
        throw new ApiError(400, "Duration is required");

    const videolink = await uploadOnCloudinary(videoFile.path);
    // console.log("video file path:", videoFile.path);
    // console.log(videolink.url);

    if(!videolink.url)
        throw new ApiError(400, "Error while uploading the video.")

    const durationNumber = Number(duration);
    if (isNaN(durationNumber)) {
    throw new ApiError(400, "Duration must be a number");
    }

        const video = await Video.create({
            videoFile: videolink.url,
            owner: req.user._id,
            title,
            duration: durationNumber
        });
        // console.log(video);
    return res
    .status(200)
    .json(new ApiResponse(200, video, "Video is uploaded"))

})

const GetAllVideos = asyncHandler(async(req, res)=>{
   const videos= await Video.find();
    console.log(videos);
    
   if(videos.length == 0)
    throw new ApiError(400, "No videos found");

   return res
   .status(200)
   .json(new ApiResponse(200, videos, "All list of videos"))
})

const GetSingleVideo = asyncHandler(async(req,res)=>{
    const video= await Video.findById(req.params._id)

    if(!video)
        throw new ApiError(404, "Video not available");

    // Agar video unpublished hai aur requester owner nahi hai → deny
    if(!video.isPublished && req.user._id.toString() !== req.owner._id.tostring())
        throw new ApiError (403, "This video is not public User")

    // ek alag sh function hm baan leh th ha.
    // video.views = video.views + 1;
    // await video.save();

    return res
    .status(200)
    .json({
        success:true,
        title:video.title,
        description:video.description
    });
})

const UpdateVideo = asyncHandler(async(req,res)=>{
    const { thumbnails, title, description }=req.body
    if(
        [ thumbnails, title, description ].some(field => !field || field.trim() === "")
    )
    throw new ApiError(400, "All fields required");

    const update = await Video.findByIdAndUpdate(req.params._id,
        {
        $set:{
            title:title,
            thumbnails:thumbnails,
            description:description
        }
    },
        { new:true })  // updated document return kare
        .select("-views -Owner -videoFile")

    return res
    .status(200)
    .json(new ApiResponse(200, update, "After Update"))
})

const DeleteVideo = asyncHandler(async(req,res)=>{
    const  videoId  =req.params.id

    if(!videoId)
        throw new ApiError(400, "Video is requried for delete")

   const video = await Video.findById(videoId)

   if(!video)
        throw new ApiError(404, "Video is not present in DB")

   if(video._id.toString() !== video.Owner.toString())
        throw new ApiError(403, "Only owner can delete this video")

    await video.deleteOne();

    return res
    .status(200)
    .json(new ApiResponse(200, null, "Video succesfully deleted."))

})

const IncrementViews = asyncHandler(async(req,res)=>{
    const  videoId = req.params.id;
    const video= await Video.findById(videoId)
    if(!video)
        throw new ApiError(404, "This video is not found in DB")
       video.views+=1
       await video.save()
       return res
       .status(200)
       .json(new ApiResponse(200, video.views, "Video views increased"))

})

const isPublished = asyncHandler(async(req,res)=>{
    const videoId= req.params.id;
    const{ isPublished }= req.body;

    const video= await Video.findById(videoId)

    if(!video)
        throw new ApiError(404, "Video not found in DB")

    video.isPublished=isPublished
    await video.save()

    return res
    .status(200)
    .json(new ApiResponse(200, video.isPublished
, "IsPublished changed"))
})

const SearchVideo = asyncHandler(async(req,res)=>{
    const videoId = req.params.id;

    if(!videoId)
        throw new ApiError(400, "Need videoId");

    const videoById = await Video.findById(videoId)

    if(videoById) {
        return res
    .status(200)
    .json(new ApiResponse(200,  videoById, "Video is founded by ID")) }

    // Search usually GET request hota hai, isliye req.body me nahi, req.query me aana chahiye.
    const { title, description } = req.query;

    if(!title && !description)
    throw new ApiError(400, "Both title and description fields are required");

    const orConditions = [];
    if (title) orConditions.push({ title: { $regex: title, $options: "i" } });
    if (description) orConditions.push({ description: { $regex: description, $options: "i" } });

// Sahi hai, bas agar multiple matches ho sakte hain → find() use karo instead of findOne()
    const videos = await Video.find({ $or: orConditions });

    // if(!video) yh galat ha ku ki find hamasah array return kr th ha.
    if(videos.length === 0)
        throw new ApiError(404, "NO match found by ID, title and Description.");

    return res.status(200)
    .json(new ApiResponse(200, videos, "Match found by title, description"))
})

//videos? [page=1] & [limit=10] & [sortBy=createdAt] & [order=desc]
// Pagination & sorting hamesha frontend se control hota hai, backend sirf rules follow karta hai.
const Pagination_Sorting = asyncHandler(async(req,res)=>{
   // const {page, limit, sortBy, order}=req.query;
   // req.query kh baad aya hua value String ho th ha, isliye us ko hmko number mh convert krna ho gh.

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const sortField = req.query.sortBy || "createdAt";
    const sortOrder = req.query.order === "asc" ? 1 : -1;

    const skip = (page-1) * limit;

    const videos= await Video.find()
                .sort({[sortField]:sortOrder})
                .skip(skip)
                .limit(limit)

    if(videos.length === 0)
        throw new ApiError(404, "Video not found in DB.")

    return res
    .status(200)
    .json(new ApiResponse(200, videos, "Result"))
})

const getOwner = asyncHandler(async(req,res)=>{
    const videoId = req.params.id
    if(!videoId)
        throw new error(400, "video Id is required")
    const video = await Video.aggregate([
         {
            $match:{
                _id : new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup:{
                from:"users",
                localField:"Owner",
                foreignField:"_id",
                as:"Owner",
               pipeline:[
                    {
                        $project:{
                            fullName:1,
                            avatar:1,
                            username:1
                        }
                    }
                ]
           }

    }
    ])

return res
.status(200)
.json(new ApiResponse(200, video[0].Owner[0].username, "Result"))
})

export{
    UploadVideo,
    GetAllVideos,
    GetSingleVideo,
    UpdateVideo,
    DeleteVideo,
    IncrementViews,
    isPublished,
    SearchVideo,
    Pagination_Sorting,
    getOwner
}