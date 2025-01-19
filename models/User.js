const mongoose =require('mongoose')
const UserSchema = new mongoose.Schema({
    name:{type:String, required:true},
    email:{type:String, required:true},
    password:{type:String,required:true},
    contacts: [
        {
          userID: String,
          name: String,
          publicKey:String
        }
      ],
      publicKey: {
        type: String, // Public key for E2EE
        required: true,
      },
      encryptedPrivateKey: {
        type: String, // Encrypted private key
        required: true,
      },
      salt: {
        type: String, // Salt used for encrypting the private key
        required: true,
      },
      iv: {
        type: String, // Initialization vector (IV) used for encryption
        required: true,
      },
      authTag: {
        type: String, // Authentication tag (GCM mode) for integrity verification
        required: true,
      }
})
const User = mongoose.model('User', UserSchema)
module.exports = User