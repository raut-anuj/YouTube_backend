//uppar mh jo likha ha woh better approach ha aur woh promise based ha.
const asyncHandler = (requestHandler) => {
    return (req, res, next) => {
        Promise.resolve(requestHandler(req, res, next))
        .catch((err) => next(err))
    }
}
export { asyncHandler }

//const asyncHandler =()=>{}

//const asyncHandler =(func)=>{}   
//yh ek Higher order function ha ku ki yh joh ha, ek function bhi accept kr rha ha as an argument.

//const asyncHandler =(func)=> ()=>{}
//yh try catch wala approach ha jo neeche likha hua ha.


// const asynchandler=(fn)=>async(req,res,next)=>{
//     try{
//         await fn(req,res,next)
//     }
//     catch(error){
//         res.status(error.code||500).json({
//             success:false,
//             message:error.message
//         })
//     }
//   }