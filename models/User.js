const mongoose =require('mongoose')
const UserSchema = new mongoose.Schema({
      clerkId: {
        type: String,
        required: true,
        unique: true,
        index: true, // Faster lookups
      },
  
      // Long-term public key (X25519 base64 encoded)
      publicKey: {
        type: String,
        required: true,
        minlength: 40, // Base64 X25519 public key length
        maxlength: 100,
      },
      keyVersion: {
        type: Number,
        default: 1,
      },
  
      // Optional meta info
      lastKeyUpdate: {
        type: Date,
        default: Date.now,
      },
    
      
}, {timestamps: true})
const User = mongoose.model('User', UserSchema)
module.exports = User