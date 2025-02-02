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
module.exports = router