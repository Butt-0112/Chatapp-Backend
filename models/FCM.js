const mongoose = require('mongoose')
const FCMSchema = new mongoose.Schema({
    clerkId:{type:String,required:true},
    token :{type:String, required:true}
})
const FCMRecord= mongoose.model('FCMRecord',FCMSchema)
module.exports = FCMRecord