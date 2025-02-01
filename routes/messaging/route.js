const express = require('express')
const router = express.Router()
const { body, validationResult } = require('express-validator')
router.get('/',async(req,res)=>{
    res.send('hello world')
})
module.exports = router