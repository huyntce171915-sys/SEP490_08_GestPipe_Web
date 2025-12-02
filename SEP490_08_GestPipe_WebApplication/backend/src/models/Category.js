const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema({
  name: {
    type: Object,
    required: true
  }
}, {
  collection: "Category"
});

module.exports = mongoose.model("Category", CategorySchema);