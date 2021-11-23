"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const register_ts_paths_1 = require("../server/helpers/register-ts-paths");
(0, register_ts_paths_1.registerTSPaths)();
const autocannon_1 = (0, tslib_1.__importStar)(require("autocannon"));
const fs_extra_1 = require("fs-extra");
const extra_utils_1 = require("@shared/extra-utils");
let server;
let video;
let threadId;
const outfile = process.argv[2];
run()
    .catch(err => console.error(err))
    .finally(() => {
    if (server)
        return (0, extra_utils_1.killallServers)([server]);
});
function buildAuthorizationHeader() {
    return {
        Authorization: 'Bearer ' + server.accessToken
    };
}
function buildAPHeader() {
    return {
        Accept: 'application/ld+json; profile="https://www.w3.org/ns/activitystreams"'
    };
}
function run() {
    return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
        console.log('Preparing server...');
        yield prepare();
        const tests = [
            {
                title: 'AP - account peertube',
                path: '/accounts/peertube',
                headers: buildAPHeader(),
                expecter: (body, status) => {
                    return status === 200 && body.startsWith('{"type":');
                }
            },
            {
                title: 'AP - video',
                path: '/videos/watch/' + video.uuid,
                headers: buildAPHeader(),
                expecter: (body, status) => {
                    return status === 200 && body.startsWith('{"type":"Video"');
                }
            },
            {
                title: 'Misc - webfinger peertube',
                path: '/.well-known/webfinger?resource=acct:peertube@' + server.host,
                expecter: (body, status) => {
                    return status === 200 && body.startsWith('{"subject":');
                }
            },
            {
                title: 'API - unread notifications',
                path: '/api/v1/users/me/notifications?start=0&count=0&unread=true',
                headers: buildAuthorizationHeader(),
                expecter: (_body, status) => {
                    return status === 200;
                }
            },
            {
                title: 'API - me',
                path: '/api/v1/users/me',
                headers: buildAuthorizationHeader(),
                expecter: (body, status) => {
                    return status === 200 && body.startsWith('{"id":');
                }
            },
            {
                title: 'API - videos list',
                path: '/api/v1/videos',
                expecter: (body, status) => {
                    return status === 200 && body.startsWith('{"total":10');
                }
            },
            {
                title: 'API - video get',
                path: '/api/v1/videos/' + video.uuid,
                expecter: (body, status) => {
                    return status === 200 && body.startsWith('{"id":');
                }
            },
            {
                title: 'API - video captions',
                path: '/api/v1/videos/' + video.uuid + '/captions',
                expecter: (body, status) => {
                    return status === 200 && body.startsWith('{"total":4');
                }
            },
            {
                title: 'API - video threads',
                path: '/api/v1/videos/' + video.uuid + '/comment-threads',
                expecter: (body, status) => {
                    return status === 200 && body.startsWith('{"total":10');
                }
            },
            {
                title: 'API - video replies',
                path: '/api/v1/videos/' + video.uuid + '/comment-threads/' + threadId,
                expecter: (body, status) => {
                    return status === 200 && body.startsWith('{"comment":{');
                }
            },
            {
                title: 'HTML - video watch',
                path: '/videos/watch/' + video.uuid,
                expecter: (body, status) => {
                    return status === 200 && body.includes('<title>my super');
                }
            },
            {
                title: 'HTML - video embed',
                path: '/videos/embed/' + video.uuid,
                expecter: (body, status) => {
                    return status === 200 && body.includes('embed');
                }
            },
            {
                title: 'HTML - homepage',
                path: '/',
                expecter: (_body, status) => {
                    return status === 200;
                }
            },
            {
                title: 'API - config',
                path: '/api/v1/config',
                expecter: (body, status) => {
                    return status === 200 && body.startsWith('{"instance":');
                }
            }
        ];
        const finalResult = [];
        for (const test of tests) {
            console.log('Running against %s.', test.path);
            const testResult = yield runBenchmark(test);
            Object.assign(testResult, { title: test.title, path: test.path });
            finalResult.push(testResult);
            console.log((0, autocannon_1.printResult)(testResult));
        }
        if (outfile)
            yield (0, fs_extra_1.writeJson)(outfile, finalResult);
    });
}
function runBenchmark(options) {
    const { path, expecter, headers } = options;
    return new Promise((res, rej) => {
        (0, autocannon_1.default)({
            url: server.url + path,
            connections: 20,
            headers,
            pipelining: 1,
            duration: 10,
            requests: [
                {
                    onResponse: (status, body) => {
                        if (expecter(body, status) !== true) {
                            console.error('Expected result failed.', { body, status });
                            throw new Error('Invalid expectation');
                        }
                    }
                }
            ]
        }, (err, result) => {
            if (err)
                return rej(err);
            return res(result);
        });
    });
}
function prepare() {
    return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
        server = yield (0, extra_utils_1.createSingleServer)(1, {
            rates_limit: {
                api: {
                    max: 5000000
                }
            }
        });
        yield (0, extra_utils_1.setAccessTokensToServers)([server]);
        const attributes = {
            name: 'my super video',
            category: 2,
            nsfw: true,
            licence: 6,
            language: 'fr',
            privacy: 1,
            support: 'please give me a coffee',
            description: 'my super description'.repeat(10),
            tags: ['tag1', 'tag2', 'tag3']
        };
        for (let i = 0; i < 10; i++) {
            yield server.videos.upload({ attributes: Object.assign(Object.assign({}, attributes), { name: 'my super video ' + i }) });
        }
        const { data } = yield server.videos.list();
        video = data.find(v => v.name === 'my super video 1');
        for (let i = 0; i < 10; i++) {
            const text = 'my super first comment';
            const created = yield server.comments.createThread({ videoId: video.id, text });
            threadId = created.id;
            const text1 = 'my super answer to thread 1';
            const child = yield server.comments.addReply({ videoId: video.id, toCommentId: threadId, text: text1 });
            const text2 = 'my super answer to answer of thread 1';
            yield server.comments.addReply({ videoId: video.id, toCommentId: child.id, text: text2 });
            const text3 = 'my second answer to thread 1';
            yield server.comments.addReply({ videoId: video.id, toCommentId: threadId, text: text3 });
        }
        for (const caption of ['ar', 'fr', 'en', 'zh']) {
            yield server.captions.add({
                language: caption,
                videoId: video.id,
                fixture: 'subtitle-good2.vtt'
            });
        }
        return { server, video, threadId };
    });
}
