const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  from: { type: String, required: true },
  to: { type: String, required: true },
  content: { type: String, required: true },
  delivered: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now },
  deletedBy: [{ type:String }] // Track users who have deleted the message

});

module.exports = mongoose.model('Message', messageSchema);
