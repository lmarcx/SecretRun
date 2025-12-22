const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  day: {
    type: Date,
    required: true
  },
  startingHour: {
    type: String,
    required: true
  },
  endingHour: {
    type: String,
    required: true
  },
  place: {
    type: String,
    required: true,
    trim: true
  },
  memberLimit: {
    type: Number,
    required: true,
    min: 1
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('Event', EventSchema);