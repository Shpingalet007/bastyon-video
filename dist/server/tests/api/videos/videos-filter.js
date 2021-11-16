"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
require("mocha");
const chai_1 = require("chai");
const extra_utils_1 = require("@shared/extra-utils");
const models_1 = require("@shared/models");
function getVideosNames(server, token, filter, expectedStatus = models_1.HttpStatusCode.OK_200) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const paths = [
            '/api/v1/video-channels/root_channel/videos',
            '/api/v1/accounts/root/videos',
            '/api/v1/videos',
            '/api/v1/search/videos'
        ];
        const videosResults = [];
        for (const path of paths) {
            const res = yield extra_utils_1.makeGetRequest({
                url: server.url,
                path,
                token,
                query: {
                    sort: 'createdAt',
                    filter
                },
                expectedStatus
            });
            videosResults.push(res.body.data.map(v => v.name));
        }
        return videosResults;
    });
}
describe('Test videos filter', function () {
    let servers;
    before(function () {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            this.timeout(160000);
            servers = yield extra_utils_1.createMultipleServers(2);
            yield extra_utils_1.setAccessTokensToServers(servers);
            for (const server of servers) {
                const moderator = { username: 'moderator', password: 'my super password' };
                yield server.users.create({ username: moderator.username, password: moderator.password, role: models_1.UserRole.MODERATOR });
                server['moderatorAccessToken'] = yield server.login.getAccessToken(moderator);
                yield server.videos.upload({ attributes: { name: 'public ' + server.serverNumber } });
                {
                    const attributes = { name: 'unlisted ' + server.serverNumber, privacy: 2 };
                    yield server.videos.upload({ attributes });
                }
                {
                    const attributes = { name: 'private ' + server.serverNumber, privacy: 3 };
                    yield server.videos.upload({ attributes });
                }
            }
            yield extra_utils_1.doubleFollow(servers[0], servers[1]);
        });
    });
    describe('Check videos filter', function () {
        it('Should display local videos', function () {
            return tslib_1.__awaiter(this, void 0, void 0, function* () {
                for (const server of servers) {
                    const namesResults = yield getVideosNames(server, server.accessToken, 'local');
                    for (const names of namesResults) {
                        chai_1.expect(names).to.have.lengthOf(1);
                        chai_1.expect(names[0]).to.equal('public ' + server.serverNumber);
                    }
                }
            });
        });
        it('Should display all local videos by the admin or the moderator', function () {
            return tslib_1.__awaiter(this, void 0, void 0, function* () {
                for (const server of servers) {
                    for (const token of [server.accessToken, server['moderatorAccessToken']]) {
                        const namesResults = yield getVideosNames(server, token, 'all-local');
                        for (const names of namesResults) {
                            chai_1.expect(names).to.have.lengthOf(3);
                            chai_1.expect(names[0]).to.equal('public ' + server.serverNumber);
                            chai_1.expect(names[1]).to.equal('unlisted ' + server.serverNumber);
                            chai_1.expect(names[2]).to.equal('private ' + server.serverNumber);
                        }
                    }
                }
            });
        });
        it('Should display all videos by the admin or the moderator', function () {
            return tslib_1.__awaiter(this, void 0, void 0, function* () {
                for (const server of servers) {
                    for (const token of [server.accessToken, server['moderatorAccessToken']]) {
                        const [channelVideos, accountVideos, videos, searchVideos] = yield getVideosNames(server, token, 'all');
                        chai_1.expect(channelVideos).to.have.lengthOf(3);
                        chai_1.expect(accountVideos).to.have.lengthOf(3);
                        chai_1.expect(videos).to.have.lengthOf(5);
                        chai_1.expect(searchVideos).to.have.lengthOf(5);
                    }
                }
            });
        });
    });
    after(function () {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            yield extra_utils_1.cleanupTests(servers);
        });
    });
});
