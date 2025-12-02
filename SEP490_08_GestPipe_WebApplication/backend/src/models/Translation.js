const mongoose = require('mongoose');

const translationSchema = new mongoose.Schema({
  language: {
    type: String,
    required: true,
    enum: ['vi', 'en'],
  },
  category: {
    type: String,
    required: true,
  },
  key: {
    type: String,
    required: true,
  },
  value: {
    type: String,
    required: true,
  }
}, {
  timestamps: true,
  collection: 'Translations' // Specify collection name
});

// Compound index for efficient queries
translationSchema.index({ language: 1, category: 1, key: 1 });

module.exports = mongoose.model('Translation', translationSchema);
