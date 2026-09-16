const User = require('../models/User');
const { signToken } = require('../utils/jwt');
const { asyncHandler, ApiError } = require('../utils/asyncHandler');

const register = asyncHandler(async (req, res) => {
  const { name, email, password, role, phone, organization, jobTitle } = req.body;

  if (!name || !email || !password) {
    throw new ApiError(400, 'Name, email, and password are required.');
  }
  if (password.length < 6) {
    throw new ApiError(400, 'Password must be at least 6 characters.');
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) throw new ApiError(409, 'An account with this email already exists.');

  // Public self-registration can only create ATTENDEE or ORGANIZER accounts, never ADMIN
  const roleUpper = role ? role.toUpperCase() : '';
  const safeRole = ['ORGANIZER', 'ATTENDEE'].includes(roleUpper) ? roleUpper : 'ATTENDEE';

  const user = await User.create({ name, email, password, role: safeRole, phone, organization, jobTitle });
  const token = signToken(user);

  res.status(201).json({ success: true, token, user: user.toSafeObject() });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new ApiError(400, 'Email and password are required.');

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user) throw new ApiError(401, 'Invalid email or password.');

  const isMatch = await user.comparePassword(password);
  if (!isMatch) throw new ApiError(401, 'Invalid email or password.');

  if (!user.isActive) throw new ApiError(403, 'This account has been deactivated.');

  user.lastLoginAt = new Date();
  await user.save();

  const token = signToken(user);
  res.json({ success: true, token, user: user.toSafeObject() });
});

const getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, user: req.user.toSafeObject() });
});

const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone, organization, jobTitle } = req.body;
  const user = await User.findById(req.user._id);
  if (name) user.name = name;
  if (phone !== undefined) user.phone = phone;
  if (organization !== undefined) user.organization = organization;
  if (jobTitle !== undefined) user.jobTitle = jobTitle;
  await user.save();
  res.json({ success: true, user: user.toSafeObject() });
});

module.exports = { register, login, getMe, updateProfile };
