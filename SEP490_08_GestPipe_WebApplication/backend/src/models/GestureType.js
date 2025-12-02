const mongoose = require('mongoose');

const GestureTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    enum: ['static', 'dynamic']
  },
  description: {
    type: String,
    default: ''
  }
}, {
  collection: "GestureType"
});

module.exports = mongoose.model("GestureType", GestureTypeSchema);