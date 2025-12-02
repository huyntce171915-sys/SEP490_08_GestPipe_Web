  const Version = require('../models/Version');

  // =============================
  // 6. Version Stats
  // =============================
  async function getVersionStats() {
    const adoption = await Version.find({}, "name downloads")
      .sort({ downloads: -1 }).limit(5);

    const versionAdoption = adoption.map(v => ({
      version_name: v.name,
      user_count: v.downloads
    }));

    const latest = await Version.findOne()
      .sort({ release_date: -1 })
      .select("name release_name release_date description");

    let newFeatures = [];

    if (latest) {
      if (Array.isArray(latest.description)) {
        newFeatures = latest.description;
      } else if (typeof latest.description === "object" && Array.isArray(latest.description.features)) {
        newFeatures = latest.description.features;
      } else if (typeof latest.description === "string") {
        newFeatures = latest.description.split("\n");
      }
    }

    return {
      versionAdoption,
      recentUpdate: latest
        ? {
            latest_release: latest.name,
            release_date: latest.release_date,
            new_features: newFeatures
          }
        : {}
    };
  }

  module.exports = {
    getVersionStats
  };