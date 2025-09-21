const mongoose = require('mongoose');
const ciphertextSchema = new mongoose.Schema({
  ciphertext: { type: String, required: true }, // base64
  nonce: { type: String, required: true }       // base64
}, { _id: false });

const messageSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  from: { type: String, required: true },
  to: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  deletedBy: [{ type: String }],
  status: {
    sent: { type: Boolean, default: true },
    delivered: { type: Boolean, default: false },
    read: { type: Boolean, default: false },
    sentAt: Date,
    deliveredAt: Date,
    readAt: Date
  },
  ephemeralPublicKey: {
    type: String,
    required: true,
    minlength: 40, // Base64 X25519 public key length
    maxlength: 100
  },
  ciphertexts: {
    type: Map,
    of: ciphertextSchema,
    required: true
  },
  pending: { type: Boolean, default: false },
  retryCount: { type: Number, default: 0 },
  maxRetries: { type: Number, default: 5 }
});

module.exports = mongoose.model('Message', messageSchema);
