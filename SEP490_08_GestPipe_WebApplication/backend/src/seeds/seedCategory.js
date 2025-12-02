const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');

const connectDB = require('../config/db');
const Category = require('../models/Category');

(async () => {
  console.log('[seedCategory] Starting seed...');

  await connectDB();

  let exitCode = 0;

  try {
    const count = await Category.countDocuments();
    if (count > 0) {
      console.log(`[seedCategory] Collection already has ${count} documents, skipping...`);
      await mongoose.connection.close();
      process.exit(0);
    }

    // Create sample categories
    const categories = [
      {
        _id: new mongoose.Types.ObjectId("68fa48ef5d12afb2b54f45d8"),
        name: {
          en: "Education",
          vi: "Giáo dục"
        }
      },
      {
        _id: new mongoose.Types.ObjectId("68fa49155d12afb2b54f45da"),
        name: {
          en: "Business",
          vi: "Kinh doanh"
        }
      },
      {
        _id: new mongoose.Types.ObjectId("68fa492a5d12afb2b54f45dc"),
        name: {
          en: "Technology",
          vi: "Công nghệ"
        }
      },
      {
        _id: new mongoose.Types.ObjectId("6911aa08108636c33d17ccab"),
        name: {
          en: "Real Estate",
          vi: "Bất động sản"
        }
      },
      {
        _id: new mongoose.Types.ObjectId("6911aa3d108636c33d17ccad"),
        name: {
          en: "Culture & Arts",
          vi: "Văn hóa & Nghệ thuật"
        }
      }
    ];

    await Category.insertMany(categories);
    console.log(`[seedCategory] ✓ Successfully imported ${categories.length} categories`);

  } catch (err) {
    console.error('[seedCategory] Error:', err.message);
    exitCode = 1;
  } finally {
    await mongoose.connection.close();
    process.exit(exitCode);
  }
})();
