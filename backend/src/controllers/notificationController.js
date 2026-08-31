const Notification = require('../models/Notification');
const ApiResponse = require('../utils/apiResponse');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');

/**
 * GET /api/v1/notifications
 */
async function getNotifications(req, res, next) {
  try {
    const { page, limit, skip } = parsePagination(req.query);

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find({ recipient: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('sender', 'username displayName avatar')
        .populate('post', 'content moderationStatus'),
      Notification.countDocuments({ recipient: req.user._id }),
      Notification.countDocuments({ recipient: req.user._id, read: false }),
    ]);

    return ApiResponse.success(res, {
      notifications,
      unreadCount,
      pagination: buildPaginationMeta(total, page, limit),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/v1/notifications/:id/read
 */
async function markAsRead(req, res, next) {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return ApiResponse.notFound(res, 'Notification not found');
    }

    return ApiResponse.success(res, { notification }, 'Notification marked as read');
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/v1/notifications/read-all
 */
async function markAllAsRead(req, res, next) {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, read: false },
      { read: true }
    );

    return ApiResponse.success(res, null, 'All notifications marked as read');
  } catch (error) {
    next(error);
  }
}

module.exports = { getNotifications, markAsRead, markAllAsRead };
