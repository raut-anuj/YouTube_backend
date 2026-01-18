// “Whenever the user uploads photos, first they should be saved locally using Multer, and then uploaded to Cloudinary.”

import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

//  Configure Cloudinary
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary  = async (localFilePath) => {
    if (!localFilePath) return null;

    try {
        // Cloudinary and many Node.js libraries expect paths with forward slashes /.
        const sanitizedPath = localFilePath.replace(/\\/g, "/");

        // Upload the file
        const response = await cloudinary.uploader.upload(sanitizedPath, {
            resource_type: "auto"
            //"auto" tells Cloudinary:"Detect the file type automatically and handle it correctly."
          });
            // Delete the temp local file after upload
            fs.unlinkSync(localFilePath);
        return response;

    } catch (error) {
        console.error("Cloudinary upload failed:", error);

        // Delete temp file if upload failed
        if (fs.existsSync(localFilePath)) fs.unlinkSync(localFilePath);
        return null;
    }
};
export { uploadOnCloudinary };
