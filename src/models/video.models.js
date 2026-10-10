import mongoose, { Schema }from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2"
const videoSchema=new Schema(
    {
        videoFile:{
            type:String,
            required:true
        },
        thumbnails:{
           type:String,  
            required:false
        }, 
        title:{
           type:String, 
            required:false
        },
        description:{
           type:String, 
           required:false
        },
        duration:{
           type:Number, 
            required:false
        },
        views:{
           type:Number, 
            default:0
        },
        isPublished:{
           type:Boolean, 
            default:true
        },
        owner:{ 
            type: mongoose.Schema.Types.ObjectId,
            ref:"User",
            required: true
        }
    },
    {
        timestamps:true
    }
)
videoSchema.plugin(mongooseAggregatePaginate) 

export const Video= mongoose.model("Videos", videoSchema) 