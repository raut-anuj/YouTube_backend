// All 3 packets are used in this projects
// mongoose
// exprees
// .env 
//Here express is used to make apps{ variable name used everwhere in the programme }.
import express from "express";
import cors from 'cors'
import cookieParser from "cookie-parser"

const app= express();
app.use(cors({
    //This tells the server which website is allowed to send requests.
    //but here all websites are allowed because { CORS_ORIGIN=* }
    origin:process.env.CORS_ORIGIN,
    credentials:true
    //{ credentials:true } -> Allow cookies, authorization headers, and credentials to be sent with requests.
}))

// express.json() —> This built-in middleware in Express helps your app understand JSON data coming in from the client
app.use(express.json({
    limit:"16kb"//This sets a maximum size for the incoming JSON data
}))

//express.json() is used to parse JSON API requests, and  express.urlencoded() is used to parse HTML form data.

//express.urlencoded() -> Used when frontend sends data via HTML forms
app.use(express.urlencoded({ 
    extended: true, 
    limit: "16kb" }));

app.use(express.static("public"))
// It tells Express to serve files (images, CSS, JS, etc.) from the public    folder directly to the browser.


//cookie parser middleware
//yha ph hm request koh allow kiye ha ki woh mera cookie parser use kre.
//aur cookie parser use krne kh liya hmne npm mh cookie-parser install kiye ha.
//aur hm iska use [auth.middelware.js] apna middelware banane kh liye use kre gh.

app.use(cookieParser())
//[req.cookies] cookie-parser middleware se aata hai.
// jab hm yh wala line use krte ha tb [i.e:-app.use(cookieParser())]
// ➡️ tab Express incoming request ke cookies ko read karta hai
// ➡️ aur unko ek object bana kar req.cookies me daal deta hai.

import userRouter from "./routes/user.routes.js";
import videoRouter from "./routes/video.routes.js";
import subscription from "./routes/subscription.routes.js"

//import routes 
//export default router ( yha pr hm router kh name badal diye ha userRouter mh is liye hm default export use kiye th )


//routes decleration
app.use("/api/v1/users",userRouter)

app.use("/api/v1/videos",videoRouter);

app.use("/api/v1/subscription",subscription);

///api/v1/users is a structured API route where /api indicates an API, /v1 represents the version, and /users represents the user resource.

//user as a prefix kaam kr rha ha
//https://localhost:8000/api/v1/users/login   (yha ph login jb aye gh toh woh user.routes.js mh jaye gh)
//https://localhost:8000/api/v1/users/register   (yha ph register jb aye gh toh woh user.routes.js mh jaye gh)

export {app}
