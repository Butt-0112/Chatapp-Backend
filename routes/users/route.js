const express = require('express')
const router = express.Router()
const { body, validationResult } = require('express-validator')
const User = require('../../models/User')
const Message = require('../../models/Message')
const { createClerkClient } = require('@clerk/backend')
const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })
const UserContacts = require('../../models/Contacts')
const UserStatus = require('../../models/UserStatus')
const Conversation = require('../../models/Conversation')

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
      imageUrl: contact.imageUrl
    };

    // Check if a document exists for the user
    let userContacts = await UserContacts.findOne({ clerkId: userId });

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
        clerkId: userId,
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
router.delete('/deleteContact', [
  body('contactID', 'contactID is required').notEmpty(),
  body('userId', 'userId is required').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {

    const { contactID, userId } = req.body;
    const user = await UserContacts.findOneAndUpdate(
      { clerkId: userId },
      { $pull: { contacts: { clerkId: contactID } } },
      { new: true }
    );
    res.json({ contacts: user.contacts })
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error', error });
  }
})
router.post('/fetchContacts', [
  body('userId', 'userId is required').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const { userId } = req.body
  const contact = await UserContacts.findOne({ clerkId: userId })
  if (contact) {
    res.json({ contacts: contact.contacts })
  } else {
    res.status(404).json({ message: 'This user has no contacts' })
  }
})
router.post('/fetchConversations',[
  body('userId', 'userId is required').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const { userId } = req.body
  try {
    const myClerkId = userId; // from your auth middleware
    const conversations = await Conversation
      .find({ participants: myClerkId })
      .sort({ updatedAt: -1 })
      .lean();

    const shaped = conversations.map((c) => ({
      id: c._id.toString(),
      participants: c.participants,
      lastMessage: c.lastMessage,
      unreadCount: c.unreadCounts?.[myClerkId] || 0,
      updatedAt: c.updatedAt,
    }));

    res.json(shaped);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// Call when user opens a chat, to zero their own unread count
router.post('/conversations/:conversationId/read',[
  body('userId', 'userId is required').notEmpty()
], async (req, res) => {
    const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const { userId } = req.body
  try {
    const myClerkId = userId;
    await Conversation.updateOne(
      { _id: req.params.conversationId },
      { $set: { [`unreadCounts.${myClerkId}`]: 0 } }
    );
    res.sendStatus(200);
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});


router.post('/fetchMessages', [
  body('from').notEmpty(),
  body('to').notEmpty(),
  body('before').optional().isISO8601(),  // cursor — load older messages
  body('since').optional().isISO8601(),   // catch-up — load missed messages
  body('limit').optional().isInt({ min: 1, max: 100 }),
], async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

  try {
    const { from, to, before, since, limit = 30 } = req.body

    const baseQuery = {
      $or: [{ from, to }, { from: to, to: from }]
    }

    // Catch-up path — only missed messages, no pagination needed
    if (since) {
      const messages = await Message
        .find({ ...baseQuery, timestamp: { $gt: new Date(since) } })
        .sort({ timestamp: 1 })

      return res.json({ messages, hasMore: false })
    }

    // Pagination path — newest page if no cursor, older page if before is set
    const query = before
      ? { ...baseQuery, timestamp: { $lt: new Date(before) } }
      : baseQuery

    const messages = await Message
      .find(query)
      .sort({ timestamp: -1 })  // newest first so limit cuts off the oldest
      .limit(limit + 1)         // fetch one extra to know if there are more

    const hasMore = messages.length > limit
    if (hasMore) messages.pop()

    res.json({ messages: messages.reverse(), hasMore }) // back to ascending for client
  } catch (e) {
    res.status(500).json({ error: 'Internal Server Error' })
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
    const user = await clerkClient.users.getUser(userId)
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
router.post('/storePublicKey', async (req, res) => {
  const { clerkId, publicKey } = req.body
  if (!clerkId || !publicKey) {
    return res.status(400).json({
      error: "Insufficient data provided.",
    });
  }
  const user = await User.findOne({ clerkId })

  if (!user) {
    const new_user = new User({ clerkId, publicKey })
    await new_user.save()
  } else {
    await User.findOneAndUpdate({ clerkId }, { publicKey })
  }
  res.json({ message: "Public Key stored successfully" })
})
router.post('/fetchPublicKey', async (req, res) => {
  const { clerkId } = req.body
  if (!clerkId) {
    return res.status(400).json({
      error: "Insufficient data provided.",
    });
  }
  const user = await User.findOne({ clerkId })
  if (user) {
    return res.json({ publicKey: user.publicKey })
  } else {
    return res.status(404).json({
      error: "user with the provided clerkId not found!",
    });

  }
})
router.post('/fetchUserStatus', async (req, res) => {
  const { clerkId } = req.body
  if (!clerkId) {
    return res.status(400).json({
      error: "Insufficient data provided.",
    });
  }
  const status = await UserStatus.findOne({ userId: clerkId })
  if (status) {
    return res.json({ status })
  } else {
    return res.status(404).json({
      error: "user with the provided clerkId not found!",
    });

  }
})
module.exports = router