  const mongoose = require('mongoose');

  const VersionSchema = new mongoose.Schema({
    name: { type: String, required: true },             // Tên version: Gestpipe.v1.20
    release_name: { type: String },                     // Có thể giống name hoặc biệt danh riêng
    description: { type: mongoose.Schema.Types.Mixed }, // Dạng JSON, chứa text/features
    release_date: { type: Date, required: false },      // Ngày phát hành
    downloads: { type: Number, default: 0 },            // Số lượng download
    accuracy: { type: Number, default: 0 },             // Độ chính xác (float)
    status: { type: String },                           // Trạng thái version
    model_path: { type: String },                       // Đường dẫn model file
    admin_id: { type: mongoose.Types.ObjectId, ref: 'User' },
    created_at: { type: Date, default: Date.now }
  }, {
    collection: "Version"
  });

  module.exports = mongoose.model("Version", VersionSchema);