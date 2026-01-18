import mongoose, {Schema} from "mongoose";
import jwt from "jsonwebtoken"  /// what this line tells-->>"Hey, I want to use a tool called jsonwebtoken to help me work with tokens."

import bcrypt from "bcrypt"   

// what is token---->>>. A token is like a secret pass or ID card. It proves   who you are when you visit a website or use an app.
//password koh encrypt krne kh liya, hm bcrypt use kre gh.

const userSchema=new Schema({
    username:{
        type:String,
        unique:true,
        lowercase:true,
        required:true,
        trim:true,
        index:true
    },
    email:{
        type:String,
        unique:true,
        lowercase:true,
        required:true,
        trim:true,
    },
    fullName:{
        type:String,
        required:true,
        trim:true,
        index:true
    },
    //profile images
    avatar:{
        type:String,  //cloidinary URL
        required:true,
    },
    coverImage:{
        type:String,  //cloidinary URL
    },
        // yha ph reference leh gh videos kh ku ki user kh pas apni videos kh record rh gh.
    watchHistory:[{
    type: Schema.Types.ObjectId,
    ref: "Videos"
    }],
    password:{
        type:String,
        required:[true, "Password is required"]
    },
    refreshToken:{
        type:String,
    }
},
    {
        timestamps:true
    }
);

//yha pr password encrypt ho rha ha...

// {save} yha pr mongoose ka built-in middleware ha, jo document ko save krne se pehle kuch operations perform krta ha.
//jb bhi user kuch change krna aya gh aur phir jb woh save pr click kre gh tb yh pre hook chale gh always, chahe woh password change krne aya woh yh phir nhi.
//aur isko tb chalaye gh jb user password change krne aya ho tb is liye hm yha pr if use kre gh.
// aur if mh yh check ho rha ha ki user-> passwrod change krna aya ha kya??  agar YES toh change hoga warna return ho jaye gh...


userSchema.pre("save", async function () {
    if (!this.isModified("password")) return;

    this.password = await bcrypt.hash(this.password, 10);
});

// userSchema.pre("save", async function (next) {
//     if (!this.isModified("password")) return next();
//     this.password = await bcrypt.hash(this.password,10);
//     next();
// });


// Method is created to check the user password with its owns password
//ku ki joh password db mh save ho gh woh toh encrpyt rhe gh toh user samaj nhi paye gh ki uska password kya ha...is liye yh method banaya ha jh jo user ka input password ha usko db mh save password kh sath compare kr paye gh.

userSchema.methods.isPasswordCorrect=async function(password){
    return await bcrypt.compare(password,this.password)
}

//generateAccessToken yh short life time kh liye generate kiya jh th ha... eg 1hours

// jwt.sign(payload, secret, options)
// 1️⃣ payload (token ke andar kya hota hai)
//   _id: user._id,
//   email: user.email

// 🔹 2️⃣ secret (sabse important 🔐)
// process.env.ACCESS_TOKEN_SECRET

// 🔹 3️⃣ options (rules / settings)
// Common options:
// 🔸 expiresIn
// { expiresIn: "15m" }

userSchema.methods.generateAccessToken=function(){
    return jwt.sign(
        {
            //payload.
        _id:this._id,
        email:this.email
        // username:this.username,
        // fullName:this.fullName
        },

    //secret
    process.env.ACCESS_TOKEN_SECRET,

    //options(rules)
    {
        expiresIn:process.env.ACCESS_TOKEN_EXPIRY
    }
        
   )
}

//generateRefreshToken yh long life kh liye generate kiya jh th ha... eg.30days 

userSchema.methods.generateRefreshToken=function(){
    return jwt.sign(
        {
        _id:this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
        expiresIn:process.env.REFRESH_TOKEN_EXPIRY
    }
        
   )}
   //yha pr {User} ,he ha joh mongoDb sh baat kr rha ha.

export const User= mongoose.model("User", userSchema)