"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.expectStartWith = exports.testFileExistsOrNot = exports.expectLogDoesNotContain = exports.testImage = exports.dateIsValid = void 0;
const tslib_1 = require("tslib");
const chai_1 = require("chai");
const fs_extra_1 = require("fs-extra");
const path_1 = require("path");
const core_utils_1 = require("@server/helpers/core-utils");
const models_1 = require("@shared/models");
const requests_1 = require("../requests");
function dateIsValid(dateString, interval = 300000) {
    const dateToCheck = new Date(dateString);
    const now = new Date();
    return Math.abs(now.getTime() - dateToCheck.getTime()) <= interval;
}
exports.dateIsValid = dateIsValid;
function expectStartWith(str, start) {
    (0, chai_1.expect)(str.startsWith(start), `${str} does not start with ${start}`).to.be.true;
}
exports.expectStartWith = expectStartWith;
function expectLogDoesNotContain(server, str) {
    return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
        const content = yield server.servers.getLogContent();
        (0, chai_1.expect)(content.toString()).to.not.contain(str);
    });
}
exports.expectLogDoesNotContain = expectLogDoesNotContain;
function testImage(url, imageName, imagePath, extension = '.jpg') {
    return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
        const res = yield (0, requests_1.makeGetRequest)({
            url,
            path: imagePath,
            expectedStatus: models_1.HttpStatusCode.OK_200
        });
        const body = res.body;
        const data = yield (0, fs_extra_1.readFile)((0, path_1.join)((0, core_utils_1.root)(), 'server', 'tests', 'fixtures', imageName + extension));
        const minLength = body.length - ((30 * body.length) / 100);
        const maxLength = body.length + ((30 * body.length) / 100);
        (0, chai_1.expect)(data.length).to.be.above(minLength, 'the generated image is way smaller than the recorded fixture');
        (0, chai_1.expect)(data.length).to.be.below(maxLength, 'the generated image is way larger than the recorded fixture');
    });
}
exports.testImage = testImage;
function testFileExistsOrNot(server, directory, filePath, exist) {
    return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
        const base = server.servers.buildDirectory(directory);
        (0, chai_1.expect)(yield (0, fs_extra_1.pathExists)((0, path_1.join)(base, filePath))).to.equal(exist);
    });
}
exports.testFileExistsOrNot = testFileExistsOrNot;
