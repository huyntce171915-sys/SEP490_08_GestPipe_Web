const mongoose = require('mongoose');

const TopicSchema = new mongoose.Schema({
  title: {
    type: Object,
    required: true
  },
  category_id: {
    type: mongoose.Types.ObjectId,
    ref: 'Category',
    required: true
  }
}, {
  collection: "topic"
});

module.exports = mongoose.model("Topic", TopicSchema);