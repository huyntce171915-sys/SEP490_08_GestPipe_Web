const mongoose = require("mongoose");
const User = require("../models/User");
const UserProfile = require("../models/UserProfile");

/**
 * Get all users with optional status filtering.
 * Query param: status (online, offline, blocked, inactive)
 */
exports.getAllUsers = async (req, res) => {
  try {
    let filter = {};
    const { status } = req.query;
    if (status) {
      if (status === "online") filter.account_status = "activeonline";
      else if (status === "offline") filter.account_status = "activeoffline";
      else if (status === "blocked") filter.account_status = "blocked";
      else if (status === "inactive") filter.account_status = "inactive";
    }

    // Chỉ lấy các trường cần show - JOIN phone_number từ userprofiles
    const users = await User.aggregate([
      { $match: filter },
      { $lookup: {
          from: "User_Profiles",
          localField: "_id",
          foreignField: "user_id",
          as: "profile"
        }
      },
      { $unwind: { path: "$profile", preserveNullAndEmptyArrays: true }},
      { $project: {
          _id: 1,
          email: 1,
          created_at: 1,
          account_status: 1,
          gesture_request_status: 1,
          "profile.phone_number": 1,
          "profile.full_name": 1
        }
      }
    ]);

    // Format lại cho FE dễ map (tránh lỗi field không có sẽ là undefined/null)
    const result = users.map(u => ({
      id: u._id,
      email: u.email,
      phoneNumber: u.profile?.phone_number || '',
      fullName: u.profile?.full_name || '',
      createdDate: u.created_at,
      status: u.account_status,
      gesture_request_status: u.gesture_request_status || 'pending'
      // Toggle status FE tự xử lý (account_status === 'blocked' thì là khoá đóng, còn lại là mở)
    }));

    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to get users", details: err.message });
  }
};

/**
 * Get detailed info of a user (User + UserProfile)
 * Params: id (user id)
 */
exports.getUserDetail = async (req, res) => {
  try {
    const { id } = req.params;

    // Find User
    const user = await User.findById(id).select("-password_hash");
    if (!user) return res.status(404).json({ error: "User not found" });

    // Find profile for user
    const profile = await UserProfile.findOne({ user_id: user._id });

    // Các field trả về rõ ràng cho UI
    res.status(200).json({
      name: profile?.full_name || "Huy",
      birthDate: profile?.birth_date || "",
      email: user.email,
      phoneNumber: profile?.phone_number || "",
      address: profile?.address || "",
      company: profile?.company || "",
      education: profile?.education_level || "",
      createdDate: user.created_at,
      status: user.account_status,
      avatarUrl: user.avatar_url || profile?.profile_image || "",
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to get user details", details: err.message });
  }
};

/**
 * Lock a user (set status to 'blocked')
 * Params: id (user id)
 */
exports.lockUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndUpdate(
      id,
      { account_status: "blocked" },
      { new: true }
    ).select("-password_hash");

    if (!user) return res.status(404).json({ error: "User not found" });
    res.status(200).json({ message: "User locked", user });
  } catch (err) {
    res.status(500).json({ error: "Failed to lock user", details: err.message });
  }
};

/**
 * Unlock a user (set status to 'inactive')
 * Params: id (user id)
 */
exports.unlockUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndUpdate(
      id,
      { account_status: "inactive" }, // Or "activeonline"/"activeoffline" if you want to restore to last/another status
      { new: true }
    ).select("-password_hash");

    if (!user) return res.status(404).json({ error: "User not found" });
    res.status(200).json({ message: "User unlocked", user });
  } catch (err) {
    res.status(500).json({ error: "Failed to unlock user", details: err.message });
  }
};