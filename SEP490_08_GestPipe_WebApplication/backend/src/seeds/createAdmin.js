require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('../models/Admin');

const ADMIN_DATA = {
  fullName: 'Test Admin',
  email: 'admin@gestpipe.com',
  password: 'Admin@123',
  role: 'admin',
  accountStatus: 'active',
  isFirstLogin: false,
  isProfileCompleted: true,
  theme: 'dark',
  uiLanguage: 'vi',
  phoneNumber: '0987654321'
};

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB Connected...');

    const existingAdmin = await Admin.findOne({ email: ADMIN_DATA.email });

    if (existingAdmin) {
      console.log('⚠️  Admin already exists!');
      console.log('Email:', existingAdmin.email);
      console.log('Role:', existingAdmin.role);
      process.exit(0);
    }

    const admin = new Admin(ADMIN_DATA);
    await admin.save();

    console.log('🎉 Admin created successfully!');
    console.log('=====================================');
    console.log('Email:', ADMIN_DATA.email);
    console.log('Password:', ADMIN_DATA.password);
    console.log('=====================================');

    process.exit(0);
  } catch (err) {
    console.error('❌ Error creating admin:', err);
    process.exit(1);
  }
};

createAdmin();