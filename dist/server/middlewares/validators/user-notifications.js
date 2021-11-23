"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markAsReadUserNotificationsValidator = exports.updateNotificationSettingsValidator = exports.listUserNotificationsValidator = void 0;
const express_validator_1 = require("express-validator");
const misc_1 = require("../../helpers/custom-validators/misc");
const user_notifications_1 = require("../../helpers/custom-validators/user-notifications");
const logger_1 = require("../../helpers/logger");
const shared_1 = require("./shared");
const listUserNotificationsValidator = [
    (0, express_validator_1.query)('unread')
        .optional()
        .customSanitizer(misc_1.toBooleanOrNull)
        .isBoolean().withMessage('Should have a valid unread boolean'),
    (req, res, next) => {
        logger_1.logger.debug('Checking listUserNotificationsValidator parameters', { parameters: req.query });
        if ((0, shared_1.areValidationErrors)(req, res))
            return;
        return next();
    }
];
exports.listUserNotificationsValidator = listUserNotificationsValidator;
const updateNotificationSettingsValidator = [
    (0, express_validator_1.body)('newVideoFromSubscription')
        .custom(user_notifications_1.isUserNotificationSettingValid).withMessage('Should have a valid new video from subscription notification setting'),
    (0, express_validator_1.body)('newCommentOnMyVideo')
        .custom(user_notifications_1.isUserNotificationSettingValid).withMessage('Should have a valid new comment on my video notification setting'),
    (0, express_validator_1.body)('abuseAsModerator')
        .custom(user_notifications_1.isUserNotificationSettingValid).withMessage('Should have a valid abuse as moderator notification setting'),
    (0, express_validator_1.body)('videoAutoBlacklistAsModerator')
        .custom(user_notifications_1.isUserNotificationSettingValid).withMessage('Should have a valid video auto blacklist notification setting'),
    (0, express_validator_1.body)('blacklistOnMyVideo')
        .custom(user_notifications_1.isUserNotificationSettingValid).withMessage('Should have a valid new blacklist on my video notification setting'),
    (0, express_validator_1.body)('myVideoImportFinished')
        .custom(user_notifications_1.isUserNotificationSettingValid).withMessage('Should have a valid video import finished video notification setting'),
    (0, express_validator_1.body)('myVideoPublished')
        .custom(user_notifications_1.isUserNotificationSettingValid).withMessage('Should have a valid video published notification setting'),
    (0, express_validator_1.body)('commentMention')
        .custom(user_notifications_1.isUserNotificationSettingValid).withMessage('Should have a valid comment mention notification setting'),
    (0, express_validator_1.body)('newFollow')
        .custom(user_notifications_1.isUserNotificationSettingValid).withMessage('Should have a valid new follow notification setting'),
    (0, express_validator_1.body)('newUserRegistration')
        .custom(user_notifications_1.isUserNotificationSettingValid).withMessage('Should have a valid new user registration notification setting'),
    (0, express_validator_1.body)('newInstanceFollower')
        .custom(user_notifications_1.isUserNotificationSettingValid).withMessage('Should have a valid new instance follower notification setting'),
    (0, express_validator_1.body)('autoInstanceFollowing')
        .custom(user_notifications_1.isUserNotificationSettingValid).withMessage('Should have a valid new instance following notification setting'),
    (req, res, next) => {
        logger_1.logger.debug('Checking updateNotificationSettingsValidator parameters', { parameters: req.body });
        if ((0, shared_1.areValidationErrors)(req, res))
            return;
        return next();
    }
];
exports.updateNotificationSettingsValidator = updateNotificationSettingsValidator;
const markAsReadUserNotificationsValidator = [
    (0, express_validator_1.body)('ids')
        .optional()
        .custom(misc_1.isNotEmptyIntArray).withMessage('Should have a valid notification ids to mark as read'),
    (req, res, next) => {
        logger_1.logger.debug('Checking markAsReadUserNotificationsValidator parameters', { parameters: req.body });
        if ((0, shared_1.areValidationErrors)(req, res))
            return;
        return next();
    }
];
exports.markAsReadUserNotificationsValidator = markAsReadUserNotificationsValidator;
