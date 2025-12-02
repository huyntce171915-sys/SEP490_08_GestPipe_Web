const User = require('../models/User');
const UserProfile = require('../models/UserProfile');
const Session = require('../models/Session');
const Category = require('../models/Category');
const UserGestureRequest = require('../models/UserGestureRequests');
const { normalizeOccupation } = require('../utils/normalizeOccupation');

// =============================
// 1. User Stats (total, growth, online)
// =============================
async function getUserStats() {
  const now = new Date();
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  const [totalUsers, thisMonthUsers, lastMonthUsers, onlineUsers] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ created_at: { $gte: startOfThisMonth } }),
    User.countDocuments({ created_at: { $gte: startOfLastMonth, $lt: endOfLastMonth } }),
    User.countDocuments({ account_status: "activeonline" })
  ]);

  const growthRate = lastMonthUsers > 0
    ? (((thisMonthUsers - lastMonthUsers) / lastMonthUsers) * 100).toFixed(1)
    : (thisMonthUsers > 0 ? 100 : 0);

  return { totalUsers, growthRate, onlineUsers };
}

// =============================
// 2. Gender Stats
// =============================
async function getGenderStats() {
  const genderAgg = await UserProfile.aggregate([
    { $group: { _id: "$gender", count: { $sum: 1 } } }
  ]);

  const genderCounts = { male: 0, female: 0, other: 0 };

  genderAgg.forEach(g => {
    if (["male", "female", "other"].includes(g._id)) {
      genderCounts[g._id] = g.count;
    } else {
      genderCounts.other += g.count;
    }
  });

  const total = genderCounts.male + genderCounts.female + genderCounts.other || 1;

  return {
    male: ((genderCounts.male / total) * 100).toFixed(1),
    female: ((genderCounts.female / total) * 100).toFixed(1),
    other: ((genderCounts.other / total) * 100).toFixed(1)
  };
}

// =============================
// 3. Occupation Stats
// =============================
async function getOccupationStats() {
  const profiles = await UserProfile.find({ occupation: { $ne: null } }, "occupation");

  const total = profiles.length;
  const counts = {};

  profiles.forEach(p => {
    const normalized = normalizeOccupation(p.occupation);
    counts[normalized] = (counts[normalized] || 0) + 1;
  });

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  const topN = 3;
  const top = sorted.filter(([group]) => group !== "Other").slice(0, topN);

  let otherCount = 0;
  sorted.slice(topN).forEach(([group, count]) => {
    if (group !== "Other") otherCount += count;
  });
  otherCount += counts["Other"] || 0;

  const percent = top.map(([group, count]) => ({
    occupation: group,
    percent: ((count / total) * 100).toFixed(1)
  }));

  if (otherCount > 0) {
    percent.push({
      occupation: "Other",
      percent: ((otherCount / total) * 100).toFixed(1)
    });
  }

  return percent;
}

// =============================
// 4. Address Stats (top 3 city)
// =============================
async function getAddressStats() {
  const profiles = await UserProfile.find(
    { address: { $ne: null, $ne: "" } },
    "address"
  );

  const total = profiles.length;
  const counts = {};

  profiles.forEach(p => {
    const addr = p.address.trim();
    if (!addr) return;
    counts[addr] = (counts[addr] || 0) + 1;
  });

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, 3);

  let otherCount = sorted.slice(3)
    .reduce((sum, [_, val]) => sum + val, 0);

  const percent = top.map(([address, count]) => ({
    address,
    percent: ((count / total) * 100).toFixed(1)
  }));

  if (otherCount > 0) {
    percent.push({
      address: "Other",
      percent: ((otherCount / total) * 100).toFixed(1)
    });
  }

  return percent;
}

// =============================
// 5. Age Stats
// =============================
async function getAgeStats() {
  const profiles = await UserProfile.find({ birth_date: { $ne: null } }, "birth_date");

  const groups = { "16-24": 0, "25-34": 0, "35-50": 0, "50+": 0 };
  const now = new Date();

  profiles.forEach(p => {
    const birth = new Date(p.birth_date);
    if (isNaN(birth)) return;

    let age = now.getFullYear() - birth.getFullYear();
    if (
      now.getMonth() < birth.getMonth() ||
      (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())
    ) {
      age--;
    }

    if (age >= 16 && age <= 24) groups["16-24"]++;
    else if (age >= 25 && age <= 34) groups["25-34"]++;
    else if (age >= 35 && age <= 50) groups["35-50"]++;
    else if (age > 50) groups["50+"]++;
  });

  const total = Object.values(groups).reduce((a, b) => a + b, 0) || 1;

  return {
    "16-24": ((groups["16-24"] / total) * 100).toFixed(1),
    "25-34": ((groups["25-34"] / total) * 100).toFixed(1),
    "35-50": ((groups["35-50"] / total) * 100).toFixed(1),
    "50+": ((groups["50+"] / total) * 100).toFixed(1)
  };
}

// =============================
// 7. Top Category Stats
// =============================
async function getTopCategoryStats() {
  const topCategories = await Session.aggregate([
    {
      $group: {
        _id: "$category_id",
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } },
    { $limit: 3 },

    // Join sang Category để lấy tên
    {
      $lookup: {
        from: "Category",
        localField: "_id",
        foreignField: "_id",
        as: "category"
      }
    },
    { $unwind: "$category" }
  ]);

  // Chuẩn hoá dữ liệu output
  return topCategories.map(cat => ({
    category_id: cat._id,
    name: cat.category.name?.en || cat.category.name?.vi || "Unknown",
    total_sessions: cat.count
  }));
}

// =============================
// 8. User Request Stats
// =============================
async function getUserRequestStats() {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  // Sửa query cho đúng kiểu dữ liệu
  const [totalRequests, todayRequests, submitRequests, successfulRequests] = await Promise.all([
    // Tổng số request có state là "Submit" hoặc "Successful"
    UserGestureRequest.countDocuments({ "status.state": { $in: ["Submit", "Successful"] } }),
    
    // Tổng số request hôm nay với state là "Submit"
    UserGestureRequest.countDocuments({ 
      "status.state": "Submit",
      created_at: { $gte: startOfToday, $lt: endOfToday }
    }),

    // Tổng số request với state là "Submit"
    UserGestureRequest.countDocuments({ "status.state": "Submit" }),

    // Tổng số request với state là "Successful"
    UserGestureRequest.countDocuments({ "status.state": "Successful" })
  ]);

  return {
    totalRequests,
    todayRequests,
    submitRequests,
    successfulRequests
  };
}

module.exports = {
  getUserStats,
  getGenderStats,
  getOccupationStats,
  getAddressStats,
  getAgeStats,
  getTopCategoryStats,
  getUserRequestStats
};
