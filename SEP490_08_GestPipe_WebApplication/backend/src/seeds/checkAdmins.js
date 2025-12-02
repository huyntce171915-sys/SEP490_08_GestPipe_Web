const mongoose = require('mongoose');
const Admin = require('../models/Admin');
require('dotenv').config();

const checkAdmins = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const admins = await Admin.find({}, 'fullName email phoneNumber').limit(5);
    console.log('Sample admins:');
    admins.forEach(a => console.log(`${a.fullName}: ${a.email} - ${a.phoneNumber || 'No phone'}`));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
};

checkAdmins();