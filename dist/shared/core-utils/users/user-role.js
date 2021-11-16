"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasUserRight = exports.USER_ROLE_LABELS = void 0;
const users_1 = require("../../models/users");
exports.USER_ROLE_LABELS = {
    [users_1.UserRole.USER]: 'User',
    [users_1.UserRole.MODERATOR]: 'Moderator',
    [users_1.UserRole.ADMINISTRATOR]: 'Administrator'
};
const userRoleRights = {
    [users_1.UserRole.ADMINISTRATOR]: [
        0
    ],
    [users_1.UserRole.MODERATOR]: [
        12,
        6,
        13,
        14,
        15,
        16,
        17,
        20,
        10,
        11,
        1,
        21
    ],
    [users_1.UserRole.USER]: []
};
function hasUserRight(userRole, userRight) {
    const userRights = userRoleRights[userRole];
    return userRights.includes(0) || userRights.includes(userRight);
}
exports.hasUserRight = hasUserRight;
