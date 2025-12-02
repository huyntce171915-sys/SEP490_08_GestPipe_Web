require('dotenv').config();
const mongoose = require('mongoose');
const crypto = require('crypto');
const Admin = require('../models/Admin');

const SUPER_ADMIN_DATA = {
  fullName: 'Super Admin',
  email: 'superadmin@gestpipe.com',
  password: 'SuperAdmin@123', // Sẽ được hash tự động
  role: 'superadmin',
  accountStatus: 'active',
  isFirstLogin: false, // SuperAdmin đã setup sẵn
  isProfileCompleted: true,
  theme: 'dark',
  uiLanguage: 'vi',
  phoneNumber: '0123456789'
};

const createSuperAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB Connected...');

    // Check if SuperAdmin already exists
    const existingSuperAdmin = await Admin.findOne({ email: SUPER_ADMIN_DATA.email });
    
    if (existingSuperAdmin) {
      console.log('⚠️  SuperAdmin already exists!');
      console.log('Email:', existingSuperAdmin.email);
      console.log('Role:', existingSuperAdmin.role);
      process.exit(0);
    }

    // Create SuperAdmin
    const superAdmin = new Admin(SUPER_ADMIN_DATA);
    await superAdmin.save();

    console.log('🎉 SuperAdmin created successfully!');
    console.log('=====================================');
    console.log('Email:', SUPER_ADMIN_DATA.email);
    console.log('Password:', SUPER_ADMIN_DATA.password);
    console.log('=====================================');
    console.log('⚠️  Please save these credentials and change the password after first login!');

    process.exit(0);
  } catch (err) {
    console.error('❌ Error creating SuperAdmin:', err.message);
    process.exit(1);
  }
};

createSuperAdmin();
