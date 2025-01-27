const express = require('express')
const User = require('../../models/User')
const router = express.Router()
const { body, validationResult } = require('express-validator')
const Message = require('../../models/Message')
const fetchuser = require('../../middleware/fetchuser')
const { createClerkClient } = require('@clerk/backend')
const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })
const UserContacts= require('../../models/Contacts')
router.post('/fetchMoreUsers', async (req, res) => {
  const { start, end } = req.body
  const totalUsers = await User.countDocuments()
  if (totalUsers <= 10) {
    const users = await User.find()
    return res.json({ users, totalUsers })
  }

  const limit = end - start; // Calculate the number of documents to fetch

  if (start < 0 || limit <= 0) {
    return res.status(400).json({ error: "Invalid range values" });
  }
  const users = await User.find().skip(start).limit(limit)
  res.json({ users, totalUsers })
})
// router.post('/add-contact', [
//   body('contactID', 'contactID is required').notEmpty(),
//   body('userId', 'userId is required').notEmpty(),
// ], async (req, res) => {
//   const errors = validationResult(req)
//   if (!errors.isEmpty()) {
//     return res.status(400).json({ errors: errors.array() })
//   }
//   try {
//     const { userId, contactID } = req.body
    
//     const user = await clerkClient.users.getUser(userId);
//     const existingContacts = user.publicMetadata?.contacts || []; // Default to an empty array if contacts don't exist

//     // Step 2: Append the new contact
//     const contact = await clerkClient.users.getUser(contactID)
//     const formattedContact=  {
//       username: contact.username||null,
//       email: contact.emailAddresses[0]?.emailAddress ||null,
//       firstName: contact.firstName || null,
//       lastName:contact.lastName ||null,
//       publicMetadata:contact.publicMetadata || {},
//       privateMetadata:contact.privateMetadata || {}
//     }
//     const updatedContacts = [...existingContacts,formattedContact];
//       console.log(updatedContacts)
//     const updated= await clerkClient.users.updateUser(userId, { publicMetadata: { contacts: updatedContacts } })

//     res.json({ updated })
//   } catch (e) {
//     res.status(500).json({ error: "Internal Server Error",e})
//   }
// })
router.post('/add-contact', [
  body('contactID', 'contactID is required').notEmpty(),
  body('userId', 'userId is required').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { userId, contactID } = req.body;

    // Fetch the contact details from Clerk
    const contact = await clerkClient.users.getUser(contactID);

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    const contactData = {
      clerkId: contactID,
      username: contact.username,
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.primaryEmailAddress?.emailAddress,
      phone: contact.phoneNumbers[0]?.phoneNumber,
    };

    // Check if a document exists for the user
    let userContacts = await UserContacts.findOne({clerkId: userId });

    if (userContacts) {
      // Check if the contact already exists
      const existingContact = userContacts.contacts.find((c) => c.clerkId === contactID);
      if (existingContact) {
        return res.status(400).json({ error: 'Contact already added' });
      }

      // Append the new contact
      userContacts.contacts.push(contactData);
    } else {
      // Create a new document for the user if it doesn't exist
      userContacts = new UserContacts({
        clerkId : userId,
        contacts: [contactData],
      });
    }

    await userContacts.save();

    res.status(201).json({ message: 'Contact added successfully', contacts: userContacts.contacts });
  } catch (e) {
    console.error('Error adding contact:', e);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
router.post('/fetchContacts', [
  body('userId','userId is required').notEmpty()
],async(req,res)=>{
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const {userId} = req.body
  const contact = await UserContacts.findOne({clerkId:userId})
  if(contact){
    res.json({contacts:contact.contacts})
  }else{
    res.status(404).json({message:'This user has no contacts'})
  }
})
router.get('/getuser', fetchuser, async (req, res) => {
  const user = await User.findById(req.user.id).select('-password')
  res.json(user)

})
router.post('/fetchMessages',  [
  body('from', 'from is required!').notEmpty(),
  body('to', 'to is required!').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() })
  }
  try {
    const { from, to } = req.body
    // if (from !== req.user.id) return
    const messages = await Message.find({
      $or: [
        { from, to },
        { from: to, to: from }, // Fetch both sent and received messages
      ],
    }).sort({ createdAt: 1 }); // Sort by oldest to newest

    res.status(200).json(messages);
  } catch (e) {
    res.status(500).json({ error: "Internal Server Error" })

  }
})
router.post('/getUserbyId', [
  body('userId', 'userId is required').notEmpty()
], async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() })
  }
  try {
    const { userId } = req.body
    const user= await clerkClient.users.getUser(userId)
    if (!user) {
      return res.status(404).json({ error: "Specified User not found!" })
    }
    res.json(user)

  } catch (e) {
    res.status(500).json({ error: "Internal Server Error" })

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
      imageUrl: user.imageUrl || null,
      publicMetadata: user.publicMetadata,
      privateMetadata: user.privateMetadata
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