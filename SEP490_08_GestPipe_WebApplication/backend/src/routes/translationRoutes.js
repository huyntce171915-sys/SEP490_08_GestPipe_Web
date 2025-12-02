const express = require('express');
const router = express.Router();
const translationController = require('../controllers/translationController');

// Get all translations for a language
router.get('/:language', translationController.getTranslations);

// Get translations by category
router.get('/:language/:category', translationController.getTranslationsByCategory);

module.exports = router;
