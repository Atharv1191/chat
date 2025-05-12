const User = require("../models/User");

const jwt = require('jsonwebtoken')
//middelewere to protect routes
const ProtectRoute = async(req,res,next)=>{
    try{
        const token = req.headers.token;
        const decoded = jwt.verify(token,process.env.JWT_SECRET)
        const user = await User.findById(decoded.userId).select("-password");

        if(!user) return res.status(404).json({
            success:false,
            message:"User Not found"
        })
        req.user = user;
        next()
    } catch(error){
        console.log(error)
        return res.status(500).json({
            success:false,
            message:error.message
        })

    }
}
module.exports = ProtectRoute