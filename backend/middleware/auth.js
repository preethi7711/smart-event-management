const { verifyToken } = require('../utils/jwt');
const { ApiError } = require('../utils/asyncHandler');
const User = require('../models/User');

// Verifies JWT (from Authorization header or cookie) and attaches req.user
async function protect(req, res, next) {
  try {
    let token;
    const header = req.headers.authorization;
    if (header && header.startsWith('Bearer ')) {
      token = header.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return next(new ApiError(401, 'Not authorized. No token provided.'));
    }

    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      return next(new ApiError(401, 'User not found or deactivated.'));
    }

    req.user = user;
    next();
  } catch (err) {
    return next(new ApiError(401, 'Not authorized. Invalid or expired token.'));
  }
}

// Restricts a route to a set of roles, e.g. authorize('ADMIN', 'ORGANIZER')
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(new ApiError(401, 'Not authorized.'));
    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, `Role '${req.user.role}' is not permitted to perform this action.`));
    }
    next();
  };
}

// Attaches req.user if a valid token is present, but does not fail the request otherwise
async function optionalAuth(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (header && header.startsWith('Bearer ')) {
      const token = header.split(' ')[1];
      const decoded = verifyToken(token);
      const user = await User.findById(decoded.id);
      if (user && user.isActive) req.user = user;
    }
  } catch (err) {
    // ignore invalid token for optional auth
  }
  next();
}

module.exports = { protect, authorize, optionalAuth };
