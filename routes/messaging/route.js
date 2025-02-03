const express = require('express')
const router=  express.Router()
const { body, validationResult } = require('express-validator');
const Message = require('../../models/Message');
router.delete('/deleteMessage',[
    body('messageId','messageId is required').notEmpty()
],async(req,res)=>{
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
        const {messageId} = req.body
        await Message.findByIdAndDelete(messageId)
        res.json({msg:'Message Deleted Successfully!'})

        
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error',error });
    }
})
router.post('/deleteForMe', [
    body('messageId', 'messageId is required!').notEmpty(),
    body('userId', 'userId is required!').notEmpty(),
  ], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const { messageId, userId } = req.body;
      await Message.findByIdAndUpdate(messageId, {
        $addToSet: { deletedBy: userId }
      });
      res.status(200).json({ message: 'Message deleted for you' });
    } catch (e) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
  router.post('/editMessage',[
    body('messageId', 'messageId is required!').notEmpty(),
    body('content', 'content is required!').notEmpty(),
  ],async(req,res)=>{
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const {messageId,content} = req.body
      await Message.findByIdAndUpdate(messageId,{content})
      res.json({msg:'Message updated Successfully!'})
    } catch (error) {
      
    }
  })
module.exports = router