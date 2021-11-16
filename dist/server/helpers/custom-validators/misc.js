"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isFileValid = exports.isFileMimeTypeValid = exports.isFileFieldValid = exports.toIntArray = exports.toArray = exports.areUUIDsValid = exports.toIntOrNull = exports.isBooleanValid = exports.toBooleanOrNull = exports.toValueOrNull = exports.isDateValid = exports.isIdOrUUIDValid = exports.toCompleteUUID = exports.toCompleteUUIDs = exports.isUUIDValid = exports.isNotEmptyStringArray = exports.isSafePath = exports.isIdValid = exports.isIntOrNull = exports.isArray = exports.isNotEmptyIntArray = exports.isArrayOf = exports.exists = void 0;
const tslib_1 = require("tslib");
require("multer");
const path_1 = require("path");
const validator_1 = tslib_1.__importDefault(require("validator"));
const uuid_1 = require("../uuid");
function exists(value) {
    return value !== undefined && value !== null;
}
exports.exists = exists;
function isSafePath(p) {
    return exists(p) &&
        (p + '').split(path_1.sep).every(part => {
            return ['..'].includes(part) === false;
        });
}
exports.isSafePath = isSafePath;
function isArray(value) {
    return Array.isArray(value);
}
exports.isArray = isArray;
function isNotEmptyIntArray(value) {
    return Array.isArray(value) && value.every(v => validator_1.default.isInt('' + v)) && value.length !== 0;
}
exports.isNotEmptyIntArray = isNotEmptyIntArray;
function isNotEmptyStringArray(value) {
    return Array.isArray(value) && value.every(v => typeof v === 'string' && v.length !== 0) && value.length !== 0;
}
exports.isNotEmptyStringArray = isNotEmptyStringArray;
function isArrayOf(value, validator) {
    return isArray(value) && value.every(v => validator(v));
}
exports.isArrayOf = isArrayOf;
function isDateValid(value) {
    return exists(value) && validator_1.default.isISO8601(value);
}
exports.isDateValid = isDateValid;
function isIdValid(value) {
    return exists(value) && validator_1.default.isInt('' + value);
}
exports.isIdValid = isIdValid;
function isUUIDValid(value) {
    return exists(value) && validator_1.default.isUUID('' + value, 4);
}
exports.isUUIDValid = isUUIDValid;
function areUUIDsValid(values) {
    return isArray(values) && values.every(v => isUUIDValid(v));
}
exports.areUUIDsValid = areUUIDsValid;
function isIdOrUUIDValid(value) {
    return isIdValid(value) || isUUIDValid(value);
}
exports.isIdOrUUIDValid = isIdOrUUIDValid;
function isBooleanValid(value) {
    return typeof value === 'boolean' || (typeof value === 'string' && validator_1.default.isBoolean(value));
}
exports.isBooleanValid = isBooleanValid;
function isIntOrNull(value) {
    return value === null || validator_1.default.isInt('' + value);
}
exports.isIntOrNull = isIntOrNull;
function isFileFieldValid(files, field, optional = false) {
    if (!files)
        return optional;
    if (isArray(files))
        return optional;
    const fileArray = files[field];
    if (!fileArray || fileArray.length === 0) {
        return optional;
    }
    const file = fileArray[0];
    if (!file || !file.originalname)
        return false;
    return file;
}
exports.isFileFieldValid = isFileFieldValid;
function isFileMimeTypeValid(files, mimeTypeRegex, field, optional = false) {
    if (!files)
        return optional;
    if (isArray(files))
        return optional;
    const fileArray = files[field];
    if (!fileArray || fileArray.length === 0) {
        return optional;
    }
    const file = fileArray[0];
    if (!file || !file.originalname)
        return false;
    return new RegExp(`^${mimeTypeRegex}$`, 'i').test(file.mimetype);
}
exports.isFileMimeTypeValid = isFileMimeTypeValid;
function isFileValid(files, mimeTypeRegex, field, maxSize, optional = false) {
    if (!files)
        return optional;
    if (isArray(files))
        return optional;
    const fileArray = files[field];
    if (!fileArray || fileArray.length === 0) {
        return optional;
    }
    const file = fileArray[0];
    if (!file || !file.originalname)
        return false;
    if ((maxSize !== null) && file.size > maxSize)
        return false;
    return new RegExp(`^${mimeTypeRegex}$`, 'i').test(file.mimetype);
}
exports.isFileValid = isFileValid;
function toCompleteUUID(value) {
    if (uuid_1.isShortUUID(value))
        return uuid_1.shortToUUID(value);
    return value;
}
exports.toCompleteUUID = toCompleteUUID;
function toCompleteUUIDs(values) {
    return values.map(v => toCompleteUUID(v));
}
exports.toCompleteUUIDs = toCompleteUUIDs;
function toIntOrNull(value) {
    const v = toValueOrNull(value);
    if (v === null || v === undefined)
        return v;
    if (typeof v === 'number')
        return v;
    return validator_1.default.toInt('' + v);
}
exports.toIntOrNull = toIntOrNull;
function toBooleanOrNull(value) {
    const v = toValueOrNull(value);
    if (v === null || v === undefined)
        return v;
    if (typeof v === 'boolean')
        return v;
    return validator_1.default.toBoolean('' + v);
}
exports.toBooleanOrNull = toBooleanOrNull;
function toValueOrNull(value) {
    if (value === 'null')
        return null;
    return value;
}
exports.toValueOrNull = toValueOrNull;
function toArray(value) {
    if (value && isArray(value) === false)
        return [value];
    return value;
}
exports.toArray = toArray;
function toIntArray(value) {
    if (!value)
        return [];
    if (isArray(value) === false)
        return [validator_1.default.toInt(value)];
    return value.map(v => validator_1.default.toInt(v));
}
exports.toIntArray = toIntArray;
