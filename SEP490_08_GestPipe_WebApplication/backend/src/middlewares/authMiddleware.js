const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

// Protect routes - verify JWT token
exports.protect = async (req, res, next) => {
  try {
    let token;

    // Check if token exists in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized. Please login.'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if admin still exists
    const admin = await Admin.findById(decoded.id).select('-password -temporaryPassword');

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Admin no longer exists'
      });
    }

    // Check account status
    if (admin.accountStatus !== 'active') {
      return res.status(403).json({
        success: false,
        message: `Account is ${admin.accountStatus}`
      });
    }

    // Attach admin to request
    req.admin = {
      id: admin._id,
      email: admin.email,
      role: admin.role,
      fullName: admin.fullName
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired. Please login again.'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error in authentication'
    });
  }
};

// Authorize specific roles (Admin, SuperAdmin)
exports.authorize = (...roles) => {
  return (req, res, next) => {
    const userRole = req.admin.role;

    // Check if user role is in allowed roles
    const isAuthorized = roles.some(role => role === userRole);

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: `Role '${userRole}' is not authorized to access this route`
      });
    }
    next();
  };
};
