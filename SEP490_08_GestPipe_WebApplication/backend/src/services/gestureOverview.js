const DefaultGesture = require('../models/DefaultGestures');
const UserGestureRequest = require('../models/UserGestureRequests');
const UserGestureConfig = require('../models/UserGestureConfigs');
const User = require('../models/User');

/**
 * Phân tích độ chính xác trung bình của bộ cử chỉ gesture mặc định.
 * Kết quả trả về dạng { averageAccuracy: number }
 */
async function getDefaultGestureAccuracyOverview() {
  // Lấy tất cả bản ghi gesture mặc định (có trường accuracy)
  const gestures = await DefaultGesture.find({}, 'accuracy');

  // Tổng số gesture
  const totalCount = gestures.length;
  if (totalCount === 0) {
    return { averageAccuracy: 0 };
  }

  // Tổng accuracy
  const totalAccuracy = gestures.reduce((sum, gesture) => sum + (gesture.accuracy || 0), 0);

  // Tính trung bình
  let averageAccuracy = totalAccuracy / totalCount;

  // Quy đổi sang phần trăm nguyên
  averageAccuracy = Math.round(averageAccuracy * 100); // từ 0.94 --> 94, từ 1.0 --> 100

  return {
    averageAccuracy
  };
}

/**
 * Tính tỷ lệ user sử dụng Default Gesture vs Custom Gesture
 * - Default gesture: user KHÔNG có bản ghi trong bảng UserGestureConfig có trạng thái Active
 * - Custom gesture: user CÓ ít nhất một bản ghi UserGestureConfig có trạng thái Active
 * Kết quả trả về: { defaultCount, customCount, percentDefault, percentCustom }
 */
async function getGestureUse() {
  try {
    const totalUsers = await User.countDocuments();

    // Lấy danh sách user_id duy nhất có ít nhất 1 cử chỉ Active
    const customUserIds = await UserGestureConfig.distinct('user_id', {
      $or: [
        { "status.en": "Active" },
        { "status.vi": "Đã kích hoạt" }
      ]
    });

    const customCount = customUserIds.length;
    const defaultCount = totalUsers - customCount;

    // Tính phần trăm
    const percentDefault = totalUsers === 0 ? 0 : Number(((defaultCount / totalUsers) * 100).toFixed(1));
    const percentCustom  = totalUsers === 0 ? 0 : Number(((customCount   / totalUsers) * 100).toFixed(1));

    // Trả về cả count và percent để dashboard có đủ dữ liệu
    return {
      defaultCount,
      customCount,
      percentDefault,
      percentCustom
    };
  } catch (error) {
    console.error("❌ Error in getGestureUse:", error);
    throw error;
  }
}


/**
 * Trả về top 5 pose_label được custom nhiều nhất với trạng thái request Successful
 * Kết quả: [{ pose_label, count }]
 */
async function getTop5CustomUserGestures() {
  // Aggregate để đếm số lần mỗi pose_label xuất hiện với status.state = "Successful"
  const pipeline = [
    { $match: { "status.state": "Successful" } },
    { $group: { _id: "$pose_label", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 5 }
  ];

  const results = await UserGestureRequest.aggregate(pipeline);

  // Trả về danh sách [{ pose_label, count }]
  return results.map(item => ({
    pose_label: item._id,
    count: item.count
  }));
}

module.exports = {
  getDefaultGestureAccuracyOverview, 
  getGestureUse,
  getTop5CustomUserGestures
};