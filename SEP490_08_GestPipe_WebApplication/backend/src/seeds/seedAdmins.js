const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const connectDB = require('../config/db');

// Import Admin model
const Admin = require('../models/Admin');

const seedAdmins = async () => {
  try {
    // Connect to database
    await connectDB();
    console.log('Connected to MongoDB for seeding admins...');

    // Read admin data from JSON file
    const adminDataPath = path.join(__dirname, '../../../DataImport/gestpipe_dashboard.admins.json');
    const adminData = JSON.parse(fs.readFileSync(adminDataPath, 'utf-8'));

    // Convert MongoDB extended JSON format to regular objects
    const processedAdmins = adminData.map(admin => ({
      _id: new mongoose.Types.ObjectId(admin._id.$oid),
      fullName: admin.fullName,
      email: admin.email,
      password: admin.password,
      temporaryPassword: admin.temporaryPassword,
      isFirstLogin: admin.isFirstLogin,
      isProfileCompleted: admin.isProfileCompleted,
      role: admin.role,
      accountStatus: admin.accountStatus,
      theme: admin.theme,
      uiLanguage: admin.uiLanguage,
      phoneNumber: admin.phoneNumber,
      createdAt: new Date(admin.createdAt.$date),
      updatedAt: new Date(admin.updatedAt.$date)
    }));

    // Clear existing admins
    await Admin.deleteMany({});
    console.log('Cleared existing admins');

    // Insert new admins
    const insertedAdmins = await Admin.insertMany(processedAdmins);
    console.log(`Successfully seeded ${insertedAdmins.length} admins`);

    // Close connection
    await mongoose.connection.close();
    console.log('Database connection closed');

  } catch (error) {
    console.error('Error seeding admins:', error);
    process.exit(1);
  }
};

// Run seeder if called directly
if (require.main === module) {
  seedAdmins();
}

module.exports = seedAdmins;