const express = require('express')
const router = express.Router()
const { body, validationResult } = require('express-validator')
const admin = require('../../adminConfig')

const FCMRecord= require('../../models/FCM')



// Add or update token in the database
const saveToken = async (userId, token) => {
  await FCMRecord.findOneAndUpdate(
    { token },  // Find by token
    { userId },  // Update the userId if token exists
    { upsert: true, new: true }  // Insert if it doesn't exist, return the updated document
  );
};
const removeInvalidToken = async (token) => {
  await FCMRecord.findOneAndDelete({ token });
};

const sendNotification = async (token, title, body, url) => {

  const notificationMessage = {
    token: token,
    notification: {

      title: title,
      body: body,

    },
    data: {
      url: url
    }
  };

  admin.messaging().send(notificationMessage)
    .then((response) => {
      //('Successfully sent message:', response);
    })
    .catch((error) => {
      console.error('Error sending message:', error);
      if (error.errorInfo.code === 'messaging/registration-token-not-registered') {
        removeInvalidToken(token);
      }
    });
};


router.post('/send-notification', [
  body('title', 'title is required').notEmpty(),
  body('body', 'body is required').notEmpty(), 
  body('url', 'url is required').notEmpty(),
  body('token', 'token is required').notEmpty(),


], async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() })

  }
  const {token,  title, body, url } = req.body
 
  try {
     await sendNotification(token, title, body, url)
    res.json({msg:'Notifications sent successfully!'})
  } catch (error) {
    console.error('Error while sending notifications:', error);
    res.status(500).send('Error while sending notifications');
  }
})


router.post('/default-token', async (req, res) => {
  const { token ,clerkId} = req.body;

  try {
    // Use findOneAndUpdate to handle new or existing tokens atomically
     await FCMRecord.findOneAndUpdate(
      { token: token ,clerkId},  // Find by token
      { $setOnInsert: { clerkId } },  // Generate new userId if token is new
      { upsert: true, new: true }  // Create if it doesn't exist, and return the updated document
    );
    
    //('UserId associated with token:', userId);

    res.json({ message: 'Token processed successfully', clerkId });
  } catch (err) {
    console.error('Error handling token:', err);
    res.status(500).send('Error processing token');
  }
});

 

module.exports = router