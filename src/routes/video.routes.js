import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import{
        UploadVideo,
        GetAllVideos,
        GetSingleVideo,
        UpdateVideo,
        DeleteVideo,
        IncrementViews,
        isPublished,
        SearchVideo,
        Pagination_Sorting
} from "../controllers/video.controller.js"; 

const router = Router();

router.route("/videoupload")
      .post(verifyJWT, upload.single("videoFile"), UploadVideo);
router.route("/giveallvideos").get(GetAllVideos)
router.route("/givesinglevideo").get(GetSingleVideo)
router.route("/updatevideo").put(verifyJWT, UpdateVideo)
router.route("/deletevideo").delete(verifyJWT, DeleteVideo)
router.route("/increaseviews").patch(IncrementViews)
router.route("/ispublished").put(verifyJWT, isPublished)
router.route("/searchvideo").get(SearchVideo)
router.route("/paginationsorting").get(Pagination_Sorting)


export default router;