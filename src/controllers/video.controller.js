import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose from "mongoose";
import { Video } from "../models/video.models.js";
import { log } from "console";
import jwt from "jsonwebtoken";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";
import { User } from "../models/user.models.js";

const UploadVideo = asyncHandler(async(req, res)=>{
    const videoFile = req.file
    const { title, duration } = req.body;

    if(!videoFile)
        throw new ApiError(400, "Video is required.")
    
    const MAX_SIZE = 20 * 1024 * 1024

    if(videoFile.size > MAX_SIZE)
        throw new ApiError(400, "Video size must be less than 20MB");

    if (!title || title.trim() === "")
        throw new ApiError(400, "Title is required");

    if (!duration || duration.trim() === "")
        throw new ApiError(400, "Duration is required");

    const videolink = await uploadOnCloudinary(videoFile.path);

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
        
    return res
    .status(200)
    .json(new ApiResponse(200, video, "Video is uploaded"))

})

const GetAllVideos = asyncHandler(async(req, res)=>{
    const videos= await Video.find({
        owner: req.user._id
    });
    
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

    return res
    .status(200)
    .json({
        success:true,
        title:video.title,
        description:video.description
    });
})

const UpdateVideodescription = asyncHandler(async(req,res)=>{
    const { videoId } = req.params;
    const {title}=req.body

    if( [title].some(field => !field || field.trim() === "") )
    throw new ApiError(400, "All fields required");

    const update = await Video.findByIdAndUpdate(videoId,
        {
        $set:{
            title:title,
        }
    },
        { new:true })
        .select("-views -owner -videoFile")

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

       video.views+= 1

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
   const { title } = req.query;

    if(!title )
    throw new ApiError(400, "Title field is required");

    const orConditions = [];

    if (title) orConditions.push({ title: { $regex: title, $options: "i" } });
   
    const videos = await Video.find({ $or: orConditions });

    if(videos.length === 0)
        throw new ApiError(404, "No match found by title.");

    return res.status(200)
    .json(new ApiResponse(200, videos, "Match found by title"))
})

export{
    UploadVideo,
    GetAllVideos,
    GetSingleVideo,
    UpdateVideodescription,
    DeleteVideo,
    IncrementViews,
    isPublished,
    SearchVideo,
}