const mongoose = require('mongoose');

const userStatusSchema = new mongoose.Schema({
  userId: String,
  lastSeen: Date,
  online: Boolean,
  // Store pending delivery receipts when user is offline
  pendingDeliveryReceipts: [{
    messageId: String,
    from: String,
    timestamp: Date
  }],
  // Store pending read receipts
  pendingReadReceipts: [{
    messageId: String,
    from: String,
    timestamp: Date
  }]
});

module.exports = mongoose.model('UserStatus', userStatusSchema);