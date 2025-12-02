// Controller file for managing version listing and detail view (Node.js/Express with Mongoose)

const Version = require('../models/Version'); // Adjust path as needed

// GET /versions - List all versions
exports.getAllVersions = async (req, res) => {
  try {
    const versions = await Version.find({}, {
      _id: 1,
      name: 1,
      release_name: 1,
      release_date: 1,
      downloads: 1,
      accuracy: 1,
      status: 1
    }).sort({ release_date: -1 });

    const versionList = versions.map((v) => ({
      id: v._id, 
      version: v.name,
      release_name: v.release_name,
      release_date: v.release_date,
      downloads: v.downloads,
      accuracy: v.accuracy,
      status: v.status
    }));

    res.json({ versions: versionList });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /versions/:id - Get version details
exports.getVersionDetail = async (req, res) => {
  try {
    const version = await Version.findById(req.params.id);
    if (!version) {
      return res.status(404).json({ error: 'Version not found' });
    }

    // You can select which fields you want to show in detail
    res.json({
      id: version._id,
      version: version.name,
      releaseName: version.release_name,
      description: version.description,
      releaseDate: version.release_date,
      downloads: version.downloads,
      accuracy: `${version.accuracy}%`,
      status: version.status,
      modelPath: version.model_path,
      admin: version.admin_id,
      createdAt: version.created_at
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};