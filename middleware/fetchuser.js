require('dotenv').config()
const jwt = require('jsonwebtoken')
const JWT_SECRET = process.env.JWT_SECRET
const fetchuser = (req,res,next)=>{
    const token = req.headers['auth-token']
    if(!token){
        return res.status(400).json({error:"Token not found"})

    }
    try{

        const data = jwt.verify(token,JWT_SECRET)
        req.user = data.user
        next()
    }
    catch(e){
        res.status(400).json({error:"Please verify using a Valid Token!"})
    }
    
}
module.exports = fetchuser