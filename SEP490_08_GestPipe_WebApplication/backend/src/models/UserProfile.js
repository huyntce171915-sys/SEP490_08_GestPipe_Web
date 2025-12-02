  const mongoose = require('mongoose');

  const UserProfileSchema = new mongoose.Schema({
    user_id: {
      type: mongoose.Types.ObjectId,
      ref: "User",
      required: true
    },
    full_name: {
      type: String
    },
    profile_image: {
      type: String
    },
    updated_at: {
      type: Date
    },
    occupation: {
      type: String
    },
    company: {
      type: String
    },
    birth_date: {
      type: Date
    },
    education_level: {
      type: String
    },
    phone_number: {
      type: String
    },
    gender: {
      type: String,
      enum: ["male", "female", "other"]
    },
    address: {
      type: String
    }
  }, {
    collection: "User_Profiles"
  });

  module.exports = mongoose.model("UserProfile", UserProfileSchema);