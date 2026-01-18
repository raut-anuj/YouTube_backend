class ApiError extends Error {
    constructor(
        statusCode,
        message= "Something went wrong",
        errors = [],
        stack = "" )
    
        {
        super(message)
        this.statusCode = statusCode
        this.data = null
        //  ✅ In short:
        // this.data = null ensures that the object always has a data field, even when there’s no actual data to return, making your API responses predictable and uniform.
        this.message = message
        this.success = false;
        this.errors = errors

        if (stack) {
            this.stack = stack
        } else{
            Error.captureStackTrace(this, this.constructor)
        }

//   About Stack Trace  
// Exactly! You got it right — a stack trace of an error basically tells you where the error originated and the path the program took to get there. Let me explain clearly.    
// Why it’s useful Developers can debug faster by seeing exactly where the problem occurred. Without a stack trace, you might only know “something went wrong”, but not where or why.

// by the help of stack trace, we get the error in form the form of: 
// Error: User not found
//     at getUser (user.controller.js:25)
//     at processRequest (express.js:10)
    }
}

export {ApiError}