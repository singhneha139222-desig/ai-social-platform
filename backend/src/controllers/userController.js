const User = require('../models/User');
const Interaction = require('../models/Interaction');
const ApiResponse = require('../utils/apiResponse');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');

/**
 * GET /api/v1/users/:username
 */
async function getProfile(req, res, next) {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) {
      return ApiResponse.notFound(res, 'User not found');
    }

    // Check if the requesting user follows this user
    let isFollowing = false;
    if (req.user) {
      const follow = await Interaction.findOne({
        user: req.user._id,
        targetUser: user._id,
        type: 'follow',
      });
      isFollowing = !!follow;
    }

    return ApiResponse.success(res, {
      user: {
        ...user.toJSON(),
        isFollowing,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/v1/users/profile
 */
async function updateProfile(req, res, next) {
  try {
    const { username, displayName, bio, avatar, preferences, gender, website } = req.body;
    const updateFields = {};

    if (username !== undefined) updateFields.username = username;
    if (displayName !== undefined) updateFields.displayName = displayName;
    if (bio !== undefined) updateFields.bio = bio;
    if (avatar !== undefined) updateFields.avatar = avatar;
    if (gender !== undefined) updateFields.gender = gender;
    if (website !== undefined) updateFields.website = website;
    if (preferences !== undefined) {
      updateFields.preferences = {
        ...req.user.preferences, // merge with existing preferences
        ...preferences
      };
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    return ApiResponse.success(res, { user }, 'Profile updated');
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/users/profile/avatar
 */
async function uploadAvatar(req, res, next) {
  try {
    if (!req.file) {
      return ApiResponse.badRequest(res, 'No image file provided');
    }

    const avatarUrl = `/uploads/profiles/${req.file.filename}`;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { avatar: avatarUrl } },
      { new: true, runValidators: true }
    );

    return ApiResponse.success(res, { user }, 'Avatar uploaded successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/users/:username/followers
 */
async function getFollowers(req, res, next) {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) {
      return ApiResponse.notFound(res, 'User not found');
    }

    const { page, limit, skip } = parsePagination(req.query);

    const [followers, total] = await Promise.all([
      Interaction.find({ targetUser: user._id, type: 'follow' })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user', 'username displayName avatar bio'),
      Interaction.countDocuments({ targetUser: user._id, type: 'follow' }),
    ]);

    return ApiResponse.success(res, {
      users: followers.map((f) => f.user),
      pagination: buildPaginationMeta(total, page, limit),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/users/:username/following
 */
async function getFollowing(req, res, next) {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) {
      return ApiResponse.notFound(res, 'User not found');
    }

    const { page, limit, skip } = parsePagination(req.query);

    const [following, total] = await Promise.all([
      Interaction.find({ user: user._id, type: 'follow' })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('targetUser', 'username displayName avatar bio'),
      Interaction.countDocuments({ user: user._id, type: 'follow' }),
    ]);

    return ApiResponse.success(res, {
      users: following.map((f) => f.targetUser),
      pagination: buildPaginationMeta(total, page, limit),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/users/search?q=...
 */
async function searchUsers(req, res, next) {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return ApiResponse.badRequest(res, 'Search query must be at least 2 characters');
    }

    const { page, limit, skip } = parsePagination(req.query);
    const regex = new RegExp(q, 'i');

    const [users, total] = await Promise.all([
      User.find({
        $or: [{ username: regex }, { displayName: regex }],
      })
        .select('username displayName avatar bio')
        .skip(skip)
        .limit(limit),
      User.countDocuments({
        $or: [{ username: regex }, { displayName: regex }],
      }),
    ]);

    return ApiResponse.success(res, {
      users,
      pagination: buildPaginationMeta(total, page, limit),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/users/check-username?username=xyz
 */
async function checkUsernameAvailability(req, res, next) {
  try {
    const { username } = req.query;
    
    if (!username) {
      return ApiResponse.badRequest(res, 'Username is required');
    }

    // Normalization and basic validation
    const normalizedUsername = username.trim().toLowerCase();
    
    if (normalizedUsername.length < 3 || normalizedUsername.length > 30) {
      return ApiResponse.badRequest(res, 'Username must be 3-30 characters');
    }
    if (!/^[a-zA-Z0-9_]+$/.test(normalizedUsername)) {
      return ApiResponse.badRequest(res, 'Username can only contain letters, numbers, and underscores');
    }

    // Check availability
    // Exclude current user if logged in
    const query = { username: normalizedUsername };
    if (req.user) {
      query._id = { $ne: req.user._id };
    }

    const existingUser = await User.findOne(query).select('_id');

    if (!existingUser) {
      return ApiResponse.success(res, {
        available: true,
        username: normalizedUsername,
        suggestions: []
      });
    }

    // Generate suggestions if taken
    const baseSuggestions = [
      `${normalizedUsername}01`,
      `${normalizedUsername}_`,
      `${normalizedUsername}123`,
      `real${normalizedUsername}`,
      `${normalizedUsername}official`
    ];

    // Ensure suggestions match rules
    const validCandidates = baseSuggestions
      .filter(s => s.length >= 3 && s.length <= 30 && /^[a-zA-Z0-9_]+$/.test(s))
      // Add randomness to prevent collision if many people ask for the same base
      .concat([`${normalizedUsername}${Math.floor(100 + Math.random() * 900)}`]);

    // Check which candidates are available in a single query
    const takenCandidates = await User.find({ username: { $in: validCandidates } }).select('username');
    const takenUsernames = new Set(takenCandidates.map(u => u.username));

    const suggestions = validCandidates.filter(c => !takenUsernames.has(c)).slice(0, 3);

    return ApiResponse.success(res, {
      available: false,
      username: normalizedUsername,
      suggestions
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { getProfile, updateProfile, getFollowers, getFollowing, searchUsers, uploadAvatar, checkUsernameAvailability };
