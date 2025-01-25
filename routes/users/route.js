const express = require('express')
const User = require('../../models/User')
const router = express.Router()
const {body,validationResult} = require('express-validator')
const Message = require('../../models/Message')
const fetchuser= require('../../middleware/fetchuser')
const { createClerkClient } =  require('@clerk/backend')
const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })

router.post('/fetchMoreUsers',async(req,res)=>{
    const {start,end}  = req.body
    const totalUsers= await User.countDocuments()
    if(totalUsers<=10){
        const users =await User.find()
        return res.json({users,totalUsers})
    }

    const limit = end - start; // Calculate the number of documents to fetch

    if (start < 0 || limit <= 0) {
        return res.status(400).json({ error: "Invalid range values" });
    }
    const users = await User.find().skip(start).limit(limit)
    res.json({users,totalUsers})
})
router.post('/add-contact',fetchuser,[
    body('contactID','contactID is required').notEmpty()
],async(req,res)=>{
    const errors = validationResult(req)
    if(!errors.isEmpty()){
        return res.status(400).json({errors:errors.array()})
    }
    try{
        const {contactID} = req.body
        const contactUser=  await User.findById(contactID).select('-password -encryptedPrivateKey -authTag')
        if(!contactUser){
            return res.status(404).json({message: "Contact user not found!"})
        }
        const id = req.user.id
        const contact= await User.findByIdAndUpdate(id, {
            $addToSet: { contacts: { userID: contactUser._id, name: contactUser.name ,publicKey:contactUser.publicKey} },

          },{new:true});
        res.json({contact})
    }catch(e){
        res.status(500).json({error:"Internal Server Error"})
    }
})
router.get('/getuser',fetchuser,async(req,res)=>{
    const user  =await User.findById(req.user.id).select('-password')
    res.json(user)

})
router.post('/fetchMessages',fetchuser,[
    body('from','from is required!').notEmpty(),
    body('to','to is required!').notEmpty(),
],async(req,res)=>{
    const errors = validationResult(req)
    if(!errors.isEmpty()){
        return res.status(400).json({errors:errors.array()})
    }
    try{
        const {from,to} =req.body
        if(from!==req.user.id)return
        const messages = await Message.find({
            $or: [
              { from, to },
              { from: to, to: from }, // Fetch both sent and received messages
            ],
          }).sort({ createdAt: 1 }); // Sort by oldest to newest
      
          res.status(200).json(messages);
    }catch(e){
        res.status(500).json({error:"Internal Server Error"})

    }
})
router.post('/getUserbyId',[
    body('userId','userId is required').notEmpty()
],async(req,res)=>{
    const errors = validationResult(req)
    if(!errors.isEmpty()){
        return res.status(400).json({errors:errors.array()})
    }
    try{
        const {userId} = req.body
        const user = await User.findById(userId).select('-password -email -contacts -publicKey -encryptedPrivateKey -salt -iv -authTag')
        if(!user){
            return res.status(404).json({error:"Specified User not found!"})
        }
        res.json(user)

    }catch(e){
        res.status(500).json({error:"Internal Server Error"})

    }
})
router.get("/search", async (req, res) => {
    const { query, page = 1, limit = 20 } = req.query;
  
    // Validate query length
    if (!query || query.trim().length < 3) {
      return res.status(400).json({
        error: "Query must be at least 3 characters long.",
      });
    }
  
    const pageNumber = parseInt(page, 10);
    const pageSize = parseInt(limit, 10);
  
    if (isNaN(pageNumber) || isNaN(pageSize) || pageNumber < 1 || pageSize < 1) {
      return res.status(400).json({
        error: "Invalid pagination parameters.",
      });
    }
  
    try {
      const offset = (pageNumber - 1) * pageSize;
  
      // Fetch users from Clerk API
      const clerkUsers = await clerkClient.users.getUserList({
        limit: pageSize,
        offset,
        query: query.trim(),
      });
      const data = clerkUsers.data
      if (!Array.isArray(data)) {
        throw new Error("Unexpected response from Clerk API");
      }
  
      // Format the user data
      const formattedUsers = data.map((user) => ({
        id: user.id,
        username: user.username || null,
        email: user.emailAddresses[0]?.emailAddress || null,
        profileImageUrl: user.profileImageUrl || null,
      }));
  
      return res.status(200).json({
        users: formattedUsers,
        currentPage: pageNumber,
        totalPages: Math.ceil(clerkUsers.totalCount / pageSize),
        totalCount: clerkUsers.totalCount,
      });
    } catch (error) {
      console.error("Error fetching users from Clerk:", error);
      res.status(500).json({
        error: error.message || "Failed to fetch users",
      });
    }
  });
module.exports = router