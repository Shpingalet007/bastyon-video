"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
require("mocha");
const extra_utils_1 = require("@shared/extra-utils");
describe('Test videos overview', function () {
    let server;
    before(function () {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            this.timeout(30000);
            server = yield (0, extra_utils_1.createSingleServer)(1);
        });
    });
    describe('When getting videos overview', function () {
        it('Should fail with a bad pagination', function () {
            return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
                yield server.overviews.getVideos({ page: 0, expectedStatus: 400 });
                yield server.overviews.getVideos({ page: 100, expectedStatus: 400 });
            });
        });
        it('Should succeed with a good pagination', function () {
            return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
                yield server.overviews.getVideos({ page: 1 });
            });
        });
    });
    after(function () {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            yield (0, extra_utils_1.cleanupTests)([server]);
        });
    });
});
