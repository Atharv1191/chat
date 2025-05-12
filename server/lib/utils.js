
const jwt = require("jsonwebtoken")

//function to generate token for user

const generateToken = (userId)=>{
    const token = jwt.sign({userId},process.env.JWT_SECRET);
    return token
}
module.exports = generateToken