const {
  getUserStats,
  getGenderStats,
  getOccupationStats,
  getAddressStats,
  getAgeStats,
  getTopCategoryStats,
  getUserRequestStats
} = require('../services/userOverview');
const { getVersionStats } = require('../services/versionOverview');
const {
  getDefaultGestureAccuracyOverview, 
  getGestureUse,
  getTop5CustomUserGestures
} = require('../services/gestureOverview');

exports.getUserOverviewStats = async (req, res) => {
  try {
    // Sử dụng Promise.allSettled để đảm bảo luôn trả về dữ liệu (rỗng nếu lỗi)
    const results = await Promise.allSettled([
      getUserStats(),
      getGenderStats(),
      getOccupationStats(),
      getAddressStats(),
      getAgeStats(),
      getTopCategoryStats(),
      getUserRequestStats()
    ]);

    // Hàm lấy value hoặc fallback
    const getOrFallback = (idx, fallback) => {
      const r = results[idx];
      return (r && r.status === "fulfilled" && r.value !== undefined && r.value !== null) ? r.value : fallback;
    };

    const userStats        = getOrFallback(0, { totalUsers: 0, growthRate: 0, onlineUsers: 0 });
    const genderPercent    = getOrFallback(1, { male: 0, female: 0, other: 0 });
    const occupationPercent= getOrFallback(2, []);
    const cityPercent      = getOrFallback(3, []);
    const agePercent       = getOrFallback(4, { "16-24": 0, "25-34": 0, "35-50": 0, "50+": 0 });
    const topCategories    = getOrFallback(5, []);
    const userRequestStats = getOrFallback(6, { totalRequests: 0, todayRequests: 0, submitRequests: 0, successfulRequests: 0 });

    res.json({
      success: true,
      data: {
        ...userStats,
        genderPercent,
        occupationPercent,
        cityPercent,
        agePercent,
        topCategories,
        userRequestStats
      }
    });

  } catch (error) {
    console.error("Dashboard API error:", error && error.stack ? error.stack : error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getVersionOverviewStats = async (req, res) => {
  try {
    const versionData = await getVersionStats();
    res.json({ success: true, data: versionData });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


exports.getGestureOverview = async (req, res) => {
  try {
    // Đồng thời lấy các dữ liệu gesture overview
    const results = await Promise.allSettled([
      getDefaultGestureAccuracyOverview(),
      getGestureUse(),
      getTop5CustomUserGestures()
    ]);

    const getOrFallback = (idx, fallback) => {
      const r = results[idx];
      return (r && r.status === "fulfilled" && r.value !== undefined && r.value !== null) ? r.value : fallback;
    };

    const accuracyOverview = getOrFallback(0, { averageAccuracy: 0 });
    const allocationOverview = getOrFallback(1, {
      defaultCount: 0,
      customCount: 0,
      percentDefault: 0, 
      percentCustom: 0 
    });
    const topCustomGestures = getOrFallback(2, []);

    res.json({
      success: true,
      data: {
        accuracyOverview,       // { averageAccuracy }
        allocationOverview,     // { defaultCount, customCount, percentDefault, percentCustom }
        topCustomGestures      // [ { pose_label, count } ]
      }
    });

  } catch (error) {
    console.error("Gesture Overview API error:", error && error.stack ? error.stack : error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};