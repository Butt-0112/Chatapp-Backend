const path = require('path')
const mongoose = require('mongoose')
const MONGO_URI = process.env.MONGODB_URI

const dbConnect = async()=>{
    console.log(MONGO_URI)
    await mongoose.connect(MONGO_URI)
}
module.exports = dbConnect