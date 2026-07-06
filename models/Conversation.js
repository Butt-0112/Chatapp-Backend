// models/Conversation.js
const mongoose = require('mongoose');
const ciphertextSchema = new mongoose.Schema({
  ciphertext: { type: String, required: true }, // base64
  nonce: { type: String, required: true }       // base64
}, { _id: false });

const conversationSchema = new mongoose.Schema({
  participants: {
    type: [String], // clerkIds, always stored sorted for consistent lookup
    required: true,
    validate: (v) => v.length === 2,
  },
  lastMessage: {
    senderId: String,
    type: { type: String, enum: ['text', 'image', 'video', 'audio'], default: 'text' },
    createdAt: Date,
    ephemeralPublicKey: {
      type: String,
      required: true,
      minlength: 40, // Base64 X25519 public key length
      maxlength: 100
    },
    ephemeralSelfPublicKey: {
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

  },
  unreadCounts: {
    type: Map,
    of: Number,
    default: {},
  },
  updatedAt: { type: Date, default: Date.now },
});

conversationSchema.index({ participants: 1 }, { unique: true });
conversationSchema.index({ updatedAt: -1 });

module.exports = mongoose.model('Conversation', conversationSchema);