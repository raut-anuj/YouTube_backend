import mongoose, { Schema }from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2"
const videoSchema=new Schema(
    {
        videoFile:{
            type:String, //cloudinary URL
            required:true
        },
        thumbnails:{
           type:String,  //cloudinary URL 
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
           type:Number, //cloudinary URL
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
        Owner:{ 
            type:Schema.Types.ObjectId,
            ref:"User"
        }
    },
    {
        timestamps:true
    }
)
videoSchema.plugin(mongooseAggregatePaginate) 

export const Video= mongoose.model("Videos", videoSchema) 