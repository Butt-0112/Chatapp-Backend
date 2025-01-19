const express = require('express')
const crypto = require("crypto");
const router = express.Router()
const bcrypt = require('bcryptjs')
const {body,validationResult} = require('express-validator')
const User = require('../models/User')
const jwt =require('jsonwebtoken');
const fetchuser = require('../middleware/fetchuser');
const JWT_SECRET = process.env.JWT_SECRET
const PEPPER = process.env.PEPPER
function encryptPrivateKey(privateKey, password, salt) {
    const key = crypto.pbkdf2Sync(password, salt, 100000, 32, "sha256");
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

    let encrypted = cipher.update(privateKey, "utf8", "base64");
    encrypted += cipher.final("base64");
    const authTag = cipher.getAuthTag();

    return {
        encryptedPrivateKey: encrypted,
        iv: iv.toString("base64"),
        authTag: authTag.toString("base64"),
    };
}

router.post('/createuser',[
    body('name','name must be at least 3 characters long').isLength({min:3}),
    body('email','Email is required').isEmail().notEmpty(),
    body('password','password must be at least 8 characters long').isLength({min:8}),
], async(req,res)=>{
    const errors= validationResult(req)
    if(!errors.isEmpty()){
        return res.status(400).json({errors: errors.array()})

    }
    try{
        const {name,email,password} = req.body
        const user= await User.findOne({email})
        if(user){
            return res.json({msg: "Invalid Credentials"})

        }
        const salt = await bcrypt.genSalt(10)
        const secPass= await bcrypt.hash(password+PEPPER,salt)
           // Generate RSA key pair
           const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
            modulusLength: 2048, // Key size
            publicKeyEncoding: { type: "spki", format: "pem" },
            privateKeyEncoding: { type: "pkcs8", format: "pem" },
        });

        // Generate a unique salt for private key encryption
        const encryptionSalt = crypto.randomBytes(16).toString("hex");

        // Encrypt the private key
        const { encryptedPrivateKey, iv, authTag } = encryptPrivateKey(privateKey, password, encryptionSalt);

        // Create and save the new user
        const new_user = new User({
            name,
            email,
            password: secPass,
            publicKey,
            encryptedPrivateKey,
            salt: encryptionSalt,
            iv,
            authTag,
        });

        // const new_user = new User({name,email,password:secPass})
        const savedUser= await new_user.save()
        const data = {
            user:{
                id: savedUser.id
            }
        }
        const authToken = jwt.sign(data,JWT_SECRET)
        res.json({authToken})

    }catch(e){
        res.status(500).json({error: 'Internal Server Error'})
    }
})
router.post('/user/login',[
    body('email','email must be valid').isEmail().notEmpty(),
    body('password','password must be at least 8 characters long').isLength({min:8})

],async(req,res)=>{
    const errors= validationResult(req)
    if(!errors.isEmpty()){
        return res.status(400).json({errors: errors.array()})

    }
    try{
        const {email,password} = req.body
        const user = await User.findOne({email})
        
        if(!user){
            return res.json({msg:'Invalid credentials'})

        }
        const decoded_pass = await bcrypt.compare(password+PEPPER,user.password)
      
        if(!decoded_pass){
            return res.json({msg:"Invalid credentials"})
        }
        const data = {
            user: {
                id:user.id
            }
        }
        const authToken = jwt.sign(data,JWT_SECRET)
        res.json({authToken})
    }catch(e){
        res.status(500).json({error:"Internal Server Error"})
    }
})
router.get('/getPrivateKey',fetchuser,async(req,res)=>{
    const errors= validationResult(req)
    if(!errors.isEmpty()){
        return res.status(400).json({errors: errors.array()})

    }
    try{
        const userId=  req.user.id
        const user  = await User.findById(userId)
        if(!user){
            return res.status(404).json({msg:"User not found!"})
        }
        res.json({encryptedPrivateKey:user.encryptedPrivateKey,password:user.password,iv:user.iv,authTag:user.authTag,salt:user.salt})
    }catch(e){
        res.status(500).json({error:"Internal Server Error"})
    }
})
module.exports = router