import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose from "mongoose";
import { Subscription } from "../models/subscription.model.js";
import { User } from "../models/user.model.js";

const subscriber_OrNot = asyncHandler(async(req, res)=>{
      const { fullName } = req.body;

    if(!fullName || fullName.trim() === "")
        throw new ApiError(400, "FullName is required")

    const user= await User.findOne( {fullName} )

    if(!user?._id)
        throw new ApiError(404, "User does not exist.")

    const isSubscribed = await Subscription.findOne(
        { subscriber: user._id } )

        if (!isSubscribed) {
            console.log("Not Subscribed");
            return res
            .status(200)
            .json({ subscribed: false }); }

       else {
            console.log("Subscribed");
             return res
             .status(200)
             .json({ subscribed: true }); }

})

const subscriptionList = asyncHandler(async(req,res)=>{
    const { fullName } = req.body
    if(!fullName || fullName.trim() == "")
        throw new ApiError (400, "Full Name is required.")
    const user = await User.findById( {fullName} )
    if(!user)
        throw new ApiError(404, "User not found")
    const subscriptions = await Subscription.find(
        { subscriber: user._id } )
    const subscribedChannels = subscriptions.map(sub=>sub.channel)
return res
.status(200)
.json(new ApiResponse(200, subscribedChannels))

})

export{
    subscriber_OrNot,
    subscriptionList
}