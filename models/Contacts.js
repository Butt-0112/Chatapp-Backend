const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  clerkId: {
    type:String, // Reference to the contact user
    required: true,
  },
  firstName: {
    type: String,
    
  },
  lastName: {
    type: String,
  },
  imageUrl:{
    type:String
  },
  username:{
    type:String,
    required:true
  },
  email: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
  },
  addedAt: {
    type: Date,
    default: Date.now,
  },
});

const userContactsSchema = new mongoose.Schema({
  clerkId: {
    type:String, // Reference to the user who owns these contacts
    required: true,
    unique: true,
  },
  contacts: [contactSchema], // Array of contacts
});

const UserContacts = mongoose.model('UserContacts', userContactsSchema);

module.exports = UserContacts;
