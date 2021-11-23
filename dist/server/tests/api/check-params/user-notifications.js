"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
require("mocha");
const socket_io_client_1 = require("socket.io-client");
const extra_utils_1 = require("@shared/extra-utils");
const models_1 = require("@shared/models");
describe('Test user notifications API validators', function () {
    let server;
    before(function () {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            this.timeout(30000);
            server = yield (0, extra_utils_1.createSingleServer)(1);
            yield (0, extra_utils_1.setAccessTokensToServers)([server]);
        });
    });
    describe('When listing my notifications', function () {
        const path = '/api/v1/users/me/notifications';
        it('Should fail with a bad start pagination', function () {
            return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
                yield (0, extra_utils_1.checkBadStartPagination)(server.url, path, server.accessToken);
            });
        });
        it('Should fail with a bad count pagination', function () {
            return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
                yield (0, extra_utils_1.checkBadCountPagination)(server.url, path, server.accessToken);
            });
        });
        it('Should fail with an incorrect sort', function () {
            return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
                yield (0, extra_utils_1.checkBadSortPagination)(server.url, path, server.accessToken);
            });
        });
        it('Should fail with an incorrect unread parameter', function () {
            return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
                yield (0, extra_utils_1.makeGetRequest)({
                    url: server.url,
                    path,
                    query: {
                        unread: 'toto'
                    },
                    token: server.accessToken,
                    expectedStatus: models_1.HttpStatusCode.OK_200
                });
            });
        });
        it('Should fail with a non authenticated user', function () {
            return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
                yield (0, extra_utils_1.makeGetRequest)({
                    url: server.url,
                    path,
                    expectedStatus: models_1.HttpStatusCode.UNAUTHORIZED_401
                });
            });
        });
        it('Should succeed with the correct parameters', function () {
            return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
                yield (0, extra_utils_1.makeGetRequest)({
                    url: server.url,
                    path,
                    token: server.accessToken,
                    expectedStatus: models_1.HttpStatusCode.OK_200
                });
            });
        });
    });
    describe('When marking as read my notifications', function () {
        const path = '/api/v1/users/me/notifications/read';
        it('Should fail with wrong ids parameters', function () {
            return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
                yield (0, extra_utils_1.makePostBodyRequest)({
                    url: server.url,
                    path,
                    fields: {
                        ids: ['hello']
                    },
                    token: server.accessToken,
                    expectedStatus: models_1.HttpStatusCode.BAD_REQUEST_400
                });
                yield (0, extra_utils_1.makePostBodyRequest)({
                    url: server.url,
                    path,
                    fields: {
                        ids: []
                    },
                    token: server.accessToken,
                    expectedStatus: models_1.HttpStatusCode.BAD_REQUEST_400
                });
                yield (0, extra_utils_1.makePostBodyRequest)({
                    url: server.url,
                    path,
                    fields: {
                        ids: 5
                    },
                    token: server.accessToken,
                    expectedStatus: models_1.HttpStatusCode.BAD_REQUEST_400
                });
            });
        });
        it('Should fail with a non authenticated user', function () {
            return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
                yield (0, extra_utils_1.makePostBodyRequest)({
                    url: server.url,
                    path,
                    fields: {
                        ids: [5]
                    },
                    expectedStatus: models_1.HttpStatusCode.UNAUTHORIZED_401
                });
            });
        });
        it('Should succeed with the correct parameters', function () {
            return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
                yield (0, extra_utils_1.makePostBodyRequest)({
                    url: server.url,
                    path,
                    fields: {
                        ids: [5]
                    },
                    token: server.accessToken,
                    expectedStatus: models_1.HttpStatusCode.NO_CONTENT_204
                });
            });
        });
    });
    describe('When marking as read my notifications', function () {
        const path = '/api/v1/users/me/notifications/read-all';
        it('Should fail with a non authenticated user', function () {
            return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
                yield (0, extra_utils_1.makePostBodyRequest)({
                    url: server.url,
                    path,
                    expectedStatus: models_1.HttpStatusCode.UNAUTHORIZED_401
                });
            });
        });
        it('Should succeed with the correct parameters', function () {
            return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
                yield (0, extra_utils_1.makePostBodyRequest)({
                    url: server.url,
                    path,
                    token: server.accessToken,
                    expectedStatus: models_1.HttpStatusCode.NO_CONTENT_204
                });
            });
        });
    });
    describe('When updating my notification settings', function () {
        const path = '/api/v1/users/me/notification-settings';
        const correctFields = {
            newVideoFromSubscription: 1,
            newCommentOnMyVideo: 1,
            abuseAsModerator: 1,
            videoAutoBlacklistAsModerator: 1,
            blacklistOnMyVideo: 1,
            myVideoImportFinished: 1,
            myVideoPublished: 1,
            commentMention: 1,
            newFollow: 1,
            newUserRegistration: 1,
            newInstanceFollower: 1,
            autoInstanceFollowing: 1,
            abuseNewMessage: 1,
            abuseStateChange: 1,
            newPeerTubeVersion: 1,
            newPluginVersion: 1
        };
        it('Should fail with missing fields', function () {
            return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
                yield (0, extra_utils_1.makePutBodyRequest)({
                    url: server.url,
                    path,
                    token: server.accessToken,
                    fields: { newVideoFromSubscription: 1 },
                    expectedStatus: models_1.HttpStatusCode.BAD_REQUEST_400
                });
            });
        });
        it('Should fail with incorrect field values', function () {
            return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
                {
                    const fields = Object.assign(Object.assign({}, correctFields), { newCommentOnMyVideo: 15 });
                    yield (0, extra_utils_1.makePutBodyRequest)({
                        url: server.url,
                        path,
                        token: server.accessToken,
                        fields,
                        expectedStatus: models_1.HttpStatusCode.BAD_REQUEST_400
                    });
                }
                {
                    const fields = Object.assign(Object.assign({}, correctFields), { newCommentOnMyVideo: 'toto' });
                    yield (0, extra_utils_1.makePutBodyRequest)({
                        url: server.url,
                        path,
                        fields,
                        token: server.accessToken,
                        expectedStatus: models_1.HttpStatusCode.BAD_REQUEST_400
                    });
                }
            });
        });
        it('Should fail with a non authenticated user', function () {
            return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
                yield (0, extra_utils_1.makePutBodyRequest)({
                    url: server.url,
                    path,
                    fields: correctFields,
                    expectedStatus: models_1.HttpStatusCode.UNAUTHORIZED_401
                });
            });
        });
        it('Should succeed with the correct parameters', function () {
            return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
                yield (0, extra_utils_1.makePutBodyRequest)({
                    url: server.url,
                    path,
                    token: server.accessToken,
                    fields: correctFields,
                    expectedStatus: models_1.HttpStatusCode.NO_CONTENT_204
                });
            });
        });
    });
    describe('When connecting to my notification socket', function () {
        it('Should fail with no token', function (next) {
            const socket = (0, socket_io_client_1.io)(`http://localhost:${server.port}/user-notifications`, { reconnection: false });
            socket.once('connect_error', function () {
                socket.disconnect();
                next();
            });
            socket.on('connect', () => {
                socket.disconnect();
                next(new Error('Connected with a missing token.'));
            });
        });
        it('Should fail with an invalid token', function (next) {
            const socket = (0, socket_io_client_1.io)(`http://localhost:${server.port}/user-notifications`, {
                query: { accessToken: 'bad_access_token' },
                reconnection: false
            });
            socket.once('connect_error', function () {
                socket.disconnect();
                next();
            });
            socket.on('connect', () => {
                socket.disconnect();
                next(new Error('Connected with an invalid token.'));
            });
        });
        it('Should success with the correct token', function (next) {
            const socket = (0, socket_io_client_1.io)(`http://localhost:${server.port}/user-notifications`, {
                query: { accessToken: server.accessToken },
                reconnection: false
            });
            function errorListener(err) {
                next(new Error('Error in connection: ' + err));
            }
            socket.on('connect_error', errorListener);
            socket.once('connect', () => (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
                socket.disconnect();
                yield (0, extra_utils_1.wait)(500);
                next();
            }));
        });
    });
    after(function () {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            yield (0, extra_utils_1.cleanupTests)([server]);
        });
    });
});
