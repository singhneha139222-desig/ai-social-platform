const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      }
    ],
    lastMessage: {
      messageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message',
      },
      senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      text: {
        type: String,
        trim: true,
      },
      createdAt: {
        type: Date,
      },
    },
    unreadCounts: {
      type: Map,
      of: Number,
      default: {},
    },
    status: {
      type: String,
      enum: ['pending', 'accepted'],
      default: 'accepted',
    },
    initiator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Ensure there is a unique conversation between any two users
// The application logic must guarantee that participants are sorted deterministically before saving
conversationSchema.index({ 'participants.0': 1, 'participants.1': 1 }, { unique: true });

// For querying a user's conversations
conversationSchema.index({ participants: 1, 'lastMessage.createdAt': -1 });

module.exports = mongoose.model('Conversation', conversationSchema);
