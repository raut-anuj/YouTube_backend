import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken"
import { User } from "../models/user.model.js";

// 1️⃣ [ "Getting the token" ]
export const verifyJWT = asyncHandler(async(req, res, next) => {
    try {
        const token = req.cookies?.accessToken || 
        req.header("Authorization")?.replace("Bearer ", "")       
        // console.log(token);

        //2️⃣ [ "If token not found" ]
        if (!token) {
            throw new ApiError(401, "Unauthorized request")
        }  
        // 3️⃣ ["Verify the token"]
        const decodedToken = jwt.verify(
            token, process.env.ACCESS_TOKEN_SECRET
        )   

        //4️⃣ ["Get user from database"]
        const user = await User
        .findById(decodedToken?._id)
        .select("-password -refreshToken")   
        // console.log("Details about user from verifyJWT middleware:", user);
        
        //5️⃣ ["If user does not exist"]
        if (!user) {  throw new ApiError(401, "Invalid Access Token")  } 

        //6️⃣ ["Attach user to request"]
        req.user = user;

        //7️⃣ ["Allow request to continue"]
        next()
//         app.get("/profile", verifyJWT, (req, res) => {
//         res.json(req.user); // direct mil gaya
//          });

    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid access token")
    }
    
})

// Login → Server token banata hai → Cookie me bhejta hai
// → Next request → Browser token bhejta hai
// → jwt.verify(token, secret) → User authenticated