const Translation = require('../models/Translation');

// Get all translations for a specific language
exports.getTranslations = async (req, res) => {
  try {
    const { language } = req.params;

    // Validate language
    if (!['vi', 'en'].includes(language)) {
      return res.status(400).json({ message: 'Invalid language. Supported: vi, en' });
    }

    // Fetch all translations for the language
    const translations = await Translation.find({ language });

    // Transform to nested object structure
    const translationObject = {};
    translations.forEach(item => {
      if (!translationObject[item.category]) {
        translationObject[item.category] = {};
      }
      translationObject[item.category][item.key] = item.value;
    });

    res.json(translationObject);
  } catch (error) {
    console.error('Error fetching translations:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get translations by category
exports.getTranslationsByCategory = async (req, res) => {
  try {
    const { language, category } = req.params;

    if (!['vi', 'en'].includes(language)) {
      return res.status(400).json({ message: 'Invalid language. Supported: vi, en' });
    }

    const translations = await Translation.find({ language, category });

    const translationObject = {};
    translations.forEach(item => {
      translationObject[item.key] = item.value;
    });

    res.json(translationObject);
  } catch (error) {
    console.error('Error fetching translations by category:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
