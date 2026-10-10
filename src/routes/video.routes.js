import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import{
        UploadVideo,
        GetAllVideos,
        GetSingleVideo,
        UpdateVideodescription,
        DeleteVideo,
        IncrementViews,
        isPublished,
        SearchVideo,
} from "../controllers/video.controller.js"; 

const router = Router();

router.route("/videoupload")
      .post(verifyJWT, upload.single("videoFile"), UploadVideo);
router.route("/getallvideos").get(verifyJWT, GetAllVideos);
router.route("/getsinglevideo").get(verifyJWT, GetSingleVideo)
router.route("/updatevideodescription/:videoId").put(verifyJWT, UpdateVideodescription)
router.route("/deletevideo").delete(verifyJWT, DeleteVideo)
router.route("/increaseviews").patch(IncrementViews)
router.route("/ispublished").put(verifyJWT, isPublished)
router.route("/searchvideo").get(SearchVideo)

export default router;