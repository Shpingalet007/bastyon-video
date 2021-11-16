"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
require("mocha");
const chai = tslib_1.__importStar(require("chai"));
const lodash_1 = require("lodash");
const core_utils_1 = require("@shared/core-utils");
const extra_utils_1 = require("@shared/extra-utils");
const models_1 = require("@shared/models");
const ffprobe_utils_1 = require("../../../helpers/ffprobe-utils");
const expect = chai.expect;
function updateConfigForTranscoding(server) {
    return server.config.updateCustomSubConfig({
        newConfig: {
            transcoding: {
                enabled: true,
                allowAdditionalExtensions: true,
                allowAudioFiles: true,
                hls: { enabled: true },
                webtorrent: { enabled: true },
                resolutions: {
                    '0p': false,
                    '240p': true,
                    '360p': true,
                    '480p': true,
                    '720p': true,
                    '1080p': true,
                    '1440p': true,
                    '2160p': true
                }
            }
        }
    });
}
describe('Test video transcoding', function () {
    let servers = [];
    let video4k;
    before(function () {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            this.timeout(30000);
            servers = yield extra_utils_1.createMultipleServers(2);
            yield extra_utils_1.setAccessTokensToServers(servers);
            yield extra_utils_1.doubleFollow(servers[0], servers[1]);
            yield updateConfigForTranscoding(servers[1]);
        });
    });
    describe('Basic transcoding (or not)', function () {
        it('Should not transcode video on server 1', function () {
            return tslib_1.__awaiter(this, void 0, void 0, function* () {
                this.timeout(60000);
                const attributes = {
                    name: 'my super name for server 1',
                    description: 'my super description for server 1',
                    fixture: 'video_short.webm'
                };
                yield servers[0].videos.upload({ attributes });
                yield extra_utils_1.waitJobs(servers);
                for (const server of servers) {
                    const { data } = yield server.videos.list();
                    const video = data[0];
                    const videoDetails = yield server.videos.get({ id: video.id });
                    expect(videoDetails.files).to.have.lengthOf(1);
                    const magnetUri = videoDetails.files[0].magnetUri;
                    expect(magnetUri).to.match(/\.webm/);
                    const torrent = yield extra_utils_1.webtorrentAdd(magnetUri, true);
                    expect(torrent.files).to.be.an('array');
                    expect(torrent.files.length).to.equal(1);
                    expect(torrent.files[0].path).match(/\.webm$/);
                }
            });
        });
        it('Should transcode video on server 2', function () {
            return tslib_1.__awaiter(this, void 0, void 0, function* () {
                this.timeout(120000);
                const attributes = {
                    name: 'my super name for server 2',
                    description: 'my super description for server 2',
                    fixture: 'video_short.webm'
                };
                yield servers[1].videos.upload({ attributes });
                yield extra_utils_1.waitJobs(servers);
                for (const server of servers) {
                    const { data } = yield server.videos.list();
                    const video = data.find(v => v.name === attributes.name);
                    const videoDetails = yield server.videos.get({ id: video.id });
                    expect(videoDetails.files).to.have.lengthOf(4);
                    const magnetUri = videoDetails.files[0].magnetUri;
                    expect(magnetUri).to.match(/\.mp4/);
                    const torrent = yield extra_utils_1.webtorrentAdd(magnetUri, true);
                    expect(torrent.files).to.be.an('array');
                    expect(torrent.files.length).to.equal(1);
                    expect(torrent.files[0].path).match(/\.mp4$/);
                }
            });
        });
        it('Should wait for transcoding before publishing the video', function () {
            return tslib_1.__awaiter(this, void 0, void 0, function* () {
                this.timeout(160000);
                {
                    const attributes = {
                        name: 'waiting video',
                        fixture: 'video_short1.webm',
                        waitTranscoding: true
                    };
                    const { uuid } = yield servers[1].videos.upload({ attributes });
                    const videoId = uuid;
                    const body = yield servers[1].videos.get({ id: videoId });
                    expect(body.name).to.equal('waiting video');
                    expect(body.state.id).to.equal(2);
                    expect(body.state.label).to.equal('To transcode');
                    expect(body.waitTranscoding).to.be.true;
                    {
                        const { data } = yield servers[1].videos.listMyVideos();
                        const videoToFindInMine = data.find(v => v.name === attributes.name);
                        expect(videoToFindInMine).not.to.be.undefined;
                        expect(videoToFindInMine.state.id).to.equal(2);
                        expect(videoToFindInMine.state.label).to.equal('To transcode');
                        expect(videoToFindInMine.waitTranscoding).to.be.true;
                    }
                    {
                        const { data } = yield servers[1].videos.list();
                        const videoToFindInList = data.find(v => v.name === attributes.name);
                        expect(videoToFindInList).to.be.undefined;
                    }
                    yield servers[0].videos.get({ id: videoId, expectedStatus: models_1.HttpStatusCode.NOT_FOUND_404 });
                }
                yield extra_utils_1.waitJobs(servers);
                for (const server of servers) {
                    const { data } = yield server.videos.list();
                    const videoToFind = data.find(v => v.name === 'waiting video');
                    expect(videoToFind).not.to.be.undefined;
                    const videoDetails = yield server.videos.get({ id: videoToFind.id });
                    expect(videoDetails.state.id).to.equal(1);
                    expect(videoDetails.state.label).to.equal('Published');
                    expect(videoDetails.waitTranscoding).to.be.true;
                }
            });
        });
        it('Should accept and transcode additional extensions', function () {
            return tslib_1.__awaiter(this, void 0, void 0, function* () {
                this.timeout(300000);
                for (const fixture of ['video_short.mkv', 'video_short.avi']) {
                    const attributes = {
                        name: fixture,
                        fixture
                    };
                    yield servers[1].videos.upload({ attributes });
                    yield extra_utils_1.waitJobs(servers);
                    for (const server of servers) {
                        const { data } = yield server.videos.list();
                        const video = data.find(v => v.name === attributes.name);
                        const videoDetails = yield server.videos.get({ id: video.id });
                        expect(videoDetails.files).to.have.lengthOf(4);
                        const magnetUri = videoDetails.files[0].magnetUri;
                        expect(magnetUri).to.contain('.mp4');
                    }
                }
            });
        });
        it('Should transcode a 4k video', function () {
            return tslib_1.__awaiter(this, void 0, void 0, function* () {
                this.timeout(200000);
                const attributes = {
                    name: '4k video',
                    fixture: 'video_short_4k.mp4'
                };
                const { uuid } = yield servers[1].videos.upload({ attributes });
                video4k = uuid;
                yield extra_utils_1.waitJobs(servers);
                const resolutions = [240, 360, 480, 720, 1080, 1440, 2160];
                for (const server of servers) {
                    const videoDetails = yield server.videos.get({ id: video4k });
                    expect(videoDetails.files).to.have.lengthOf(resolutions.length);
                    for (const r of resolutions) {
                        expect(videoDetails.files.find(f => f.resolution.id === r)).to.not.be.undefined;
                        expect(videoDetails.streamingPlaylists[0].files.find(f => f.resolution.id === r)).to.not.be.undefined;
                    }
                }
            });
        });
    });
    describe('Audio transcoding', function () {
        it('Should transcode high bit rate mp3 to proper bit rate', function () {
            return tslib_1.__awaiter(this, void 0, void 0, function* () {
                this.timeout(60000);
                const attributes = {
                    name: 'mp3_256k',
                    fixture: 'video_short_mp3_256k.mp4'
                };
                yield servers[1].videos.upload({ attributes });
                yield extra_utils_1.waitJobs(servers);
                for (const server of servers) {
                    const { data } = yield server.videos.list();
                    const video = data.find(v => v.name === attributes.name);
                    const videoDetails = yield server.videos.get({ id: video.id });
                    expect(videoDetails.files).to.have.lengthOf(4);
                    const file = videoDetails.files.find(f => f.resolution.id === 240);
                    const path = servers[1].servers.buildWebTorrentFilePath(file.fileUrl);
                    const probe = yield ffprobe_utils_1.getAudioStream(path);
                    if (probe.audioStream) {
                        expect(probe.audioStream['codec_name']).to.be.equal('aac');
                        expect(probe.audioStream['bit_rate']).to.be.at.most(384 * 8000);
                    }
                    else {
                        this.fail('Could not retrieve the audio stream on ' + probe.absolutePath);
                    }
                }
            });
        });
        it('Should transcode video with no audio and have no audio itself', function () {
            return tslib_1.__awaiter(this, void 0, void 0, function* () {
                this.timeout(60000);
                const attributes = {
                    name: 'no_audio',
                    fixture: 'video_short_no_audio.mp4'
                };
                yield servers[1].videos.upload({ attributes });
                yield extra_utils_1.waitJobs(servers);
                for (const server of servers) {
                    const { data } = yield server.videos.list();
                    const video = data.find(v => v.name === attributes.name);
                    const videoDetails = yield server.videos.get({ id: video.id });
                    const file = videoDetails.files.find(f => f.resolution.id === 240);
                    const path = servers[1].servers.buildWebTorrentFilePath(file.fileUrl);
                    const probe = yield ffprobe_utils_1.getAudioStream(path);
                    expect(probe).to.not.have.property('audioStream');
                }
            });
        });
        it('Should leave the audio untouched, but properly transcode the video', function () {
            return tslib_1.__awaiter(this, void 0, void 0, function* () {
                this.timeout(60000);
                const attributes = {
                    name: 'untouched_audio',
                    fixture: 'video_short.mp4'
                };
                yield servers[1].videos.upload({ attributes });
                yield extra_utils_1.waitJobs(servers);
                for (const server of servers) {
                    const { data } = yield server.videos.list();
                    const video = data.find(v => v.name === attributes.name);
                    const videoDetails = yield server.videos.get({ id: video.id });
                    expect(videoDetails.files).to.have.lengthOf(4);
                    const fixturePath = extra_utils_1.buildAbsoluteFixturePath(attributes.fixture);
                    const fixtureVideoProbe = yield ffprobe_utils_1.getAudioStream(fixturePath);
                    const file = videoDetails.files.find(f => f.resolution.id === 240);
                    const path = servers[1].servers.buildWebTorrentFilePath(file.fileUrl);
                    const videoProbe = yield ffprobe_utils_1.getAudioStream(path);
                    if (videoProbe.audioStream && fixtureVideoProbe.audioStream) {
                        const toOmit = ['max_bit_rate', 'duration', 'duration_ts', 'nb_frames', 'start_time', 'start_pts'];
                        expect(lodash_1.omit(videoProbe.audioStream, toOmit)).to.be.deep.equal(lodash_1.omit(fixtureVideoProbe.audioStream, toOmit));
                    }
                    else {
                        this.fail('Could not retrieve the audio stream on ' + videoProbe.absolutePath);
                    }
                }
            });
        });
    });
    describe('Audio upload', function () {
        function runSuite(mode) {
            before(function () {
                return tslib_1.__awaiter(this, void 0, void 0, function* () {
                    yield servers[1].config.updateCustomSubConfig({
                        newConfig: {
                            transcoding: {
                                hls: { enabled: true },
                                webtorrent: { enabled: true },
                                resolutions: {
                                    '0p': false,
                                    '240p': false,
                                    '360p': false,
                                    '480p': false,
                                    '720p': false,
                                    '1080p': false,
                                    '1440p': false,
                                    '2160p': false
                                }
                            }
                        }
                    });
                });
            });
            it('Should merge an audio file with the preview file', function () {
                return tslib_1.__awaiter(this, void 0, void 0, function* () {
                    this.timeout(60000);
                    const attributes = { name: 'audio_with_preview', previewfile: 'preview.jpg', fixture: 'sample.ogg' };
                    yield servers[1].videos.upload({ attributes, mode });
                    yield extra_utils_1.waitJobs(servers);
                    for (const server of servers) {
                        const { data } = yield server.videos.list();
                        const video = data.find(v => v.name === 'audio_with_preview');
                        const videoDetails = yield server.videos.get({ id: video.id });
                        expect(videoDetails.files).to.have.lengthOf(1);
                        yield extra_utils_1.makeGetRequest({ url: server.url, path: videoDetails.thumbnailPath, expectedStatus: models_1.HttpStatusCode.OK_200 });
                        yield extra_utils_1.makeGetRequest({ url: server.url, path: videoDetails.previewPath, expectedStatus: models_1.HttpStatusCode.OK_200 });
                        const magnetUri = videoDetails.files[0].magnetUri;
                        expect(magnetUri).to.contain('.mp4');
                    }
                });
            });
            it('Should upload an audio file and choose a default background image', function () {
                return tslib_1.__awaiter(this, void 0, void 0, function* () {
                    this.timeout(60000);
                    const attributes = { name: 'audio_without_preview', fixture: 'sample.ogg' };
                    yield servers[1].videos.upload({ attributes, mode });
                    yield extra_utils_1.waitJobs(servers);
                    for (const server of servers) {
                        const { data } = yield server.videos.list();
                        const video = data.find(v => v.name === 'audio_without_preview');
                        const videoDetails = yield server.videos.get({ id: video.id });
                        expect(videoDetails.files).to.have.lengthOf(1);
                        yield extra_utils_1.makeGetRequest({ url: server.url, path: videoDetails.thumbnailPath, expectedStatus: models_1.HttpStatusCode.OK_200 });
                        yield extra_utils_1.makeGetRequest({ url: server.url, path: videoDetails.previewPath, expectedStatus: models_1.HttpStatusCode.OK_200 });
                        const magnetUri = videoDetails.files[0].magnetUri;
                        expect(magnetUri).to.contain('.mp4');
                    }
                });
            });
            it('Should upload an audio file and create an audio version only', function () {
                return tslib_1.__awaiter(this, void 0, void 0, function* () {
                    this.timeout(60000);
                    yield servers[1].config.updateCustomSubConfig({
                        newConfig: {
                            transcoding: {
                                hls: { enabled: true },
                                webtorrent: { enabled: true },
                                resolutions: {
                                    '0p': true,
                                    '240p': false,
                                    '360p': false
                                }
                            }
                        }
                    });
                    const attributes = { name: 'audio_with_preview', previewfile: 'preview.jpg', fixture: 'sample.ogg' };
                    const { id } = yield servers[1].videos.upload({ attributes, mode });
                    yield extra_utils_1.waitJobs(servers);
                    for (const server of servers) {
                        const videoDetails = yield server.videos.get({ id });
                        for (const files of [videoDetails.files, videoDetails.streamingPlaylists[0].files]) {
                            expect(files).to.have.lengthOf(2);
                            expect(files.find(f => f.resolution.id === 0)).to.not.be.undefined;
                        }
                    }
                    yield updateConfigForTranscoding(servers[1]);
                });
            });
        }
        describe('Legacy upload', function () {
            runSuite('legacy');
        });
        describe('Resumable upload', function () {
            runSuite('resumable');
        });
    });
    describe('Framerate', function () {
        it('Should transcode a 60 FPS video', function () {
            return tslib_1.__awaiter(this, void 0, void 0, function* () {
                this.timeout(60000);
                const attributes = {
                    name: 'my super 30fps name for server 2',
                    description: 'my super 30fps description for server 2',
                    fixture: '60fps_720p_small.mp4'
                };
                yield servers[1].videos.upload({ attributes });
                yield extra_utils_1.waitJobs(servers);
                for (const server of servers) {
                    const { data } = yield server.videos.list();
                    const video = data.find(v => v.name === attributes.name);
                    const videoDetails = yield server.videos.get({ id: video.id });
                    expect(videoDetails.files).to.have.lengthOf(4);
                    expect(videoDetails.files[0].fps).to.be.above(58).and.below(62);
                    expect(videoDetails.files[1].fps).to.be.below(31);
                    expect(videoDetails.files[2].fps).to.be.below(31);
                    expect(videoDetails.files[3].fps).to.be.below(31);
                    for (const resolution of [240, 360, 480]) {
                        const file = videoDetails.files.find(f => f.resolution.id === resolution);
                        const path = servers[1].servers.buildWebTorrentFilePath(file.fileUrl);
                        const fps = yield ffprobe_utils_1.getVideoFileFPS(path);
                        expect(fps).to.be.below(31);
                    }
                    const file = videoDetails.files.find(f => f.resolution.id === 720);
                    const path = servers[1].servers.buildWebTorrentFilePath(file.fileUrl);
                    const fps = yield ffprobe_utils_1.getVideoFileFPS(path);
                    expect(fps).to.be.above(58).and.below(62);
                }
            });
        });
        it('Should downscale to the closest divisor standard framerate', function () {
            return tslib_1.__awaiter(this, void 0, void 0, function* () {
                this.timeout(200000);
                let tempFixturePath;
                {
                    tempFixturePath = yield extra_utils_1.generateVideoWithFramerate(59);
                    const fps = yield ffprobe_utils_1.getVideoFileFPS(tempFixturePath);
                    expect(fps).to.be.equal(59);
                }
                const attributes = {
                    name: '59fps video',
                    description: '59fps video',
                    fixture: tempFixturePath
                };
                yield servers[1].videos.upload({ attributes });
                yield extra_utils_1.waitJobs(servers);
                for (const server of servers) {
                    const { data } = yield server.videos.list();
                    const { id } = data.find(v => v.name === attributes.name);
                    const video = yield server.videos.get({ id });
                    {
                        const file = video.files.find(f => f.resolution.id === 240);
                        const path = servers[1].servers.buildWebTorrentFilePath(file.fileUrl);
                        const fps = yield ffprobe_utils_1.getVideoFileFPS(path);
                        expect(fps).to.be.equal(25);
                    }
                    {
                        const file = video.files.find(f => f.resolution.id === 720);
                        const path = servers[1].servers.buildWebTorrentFilePath(file.fileUrl);
                        const fps = yield ffprobe_utils_1.getVideoFileFPS(path);
                        expect(fps).to.be.equal(59);
                    }
                }
            });
        });
    });
    describe('Bitrate control', function () {
        it('Should respect maximum bitrate values', function () {
            return tslib_1.__awaiter(this, void 0, void 0, function* () {
                this.timeout(160000);
                const tempFixturePath = yield extra_utils_1.generateHighBitrateVideo();
                const attributes = {
                    name: 'high bitrate video',
                    description: 'high bitrate video',
                    fixture: tempFixturePath
                };
                yield servers[1].videos.upload({ attributes });
                yield extra_utils_1.waitJobs(servers);
                for (const server of servers) {
                    const { data } = yield server.videos.list();
                    const { id } = data.find(v => v.name === attributes.name);
                    const video = yield server.videos.get({ id });
                    for (const resolution of [240, 360, 480, 720, 1080]) {
                        const file = video.files.find(f => f.resolution.id === resolution);
                        const path = servers[1].servers.buildWebTorrentFilePath(file.fileUrl);
                        const bitrate = yield ffprobe_utils_1.getVideoFileBitrate(path);
                        const fps = yield ffprobe_utils_1.getVideoFileFPS(path);
                        const dataResolution = yield ffprobe_utils_1.getVideoFileResolution(path);
                        expect(resolution).to.equal(resolution);
                        const maxBitrate = core_utils_1.getMaxBitrate(Object.assign(Object.assign({}, dataResolution), { fps }));
                        expect(bitrate).to.be.below(maxBitrate);
                    }
                }
            });
        });
        it('Should not transcode to an higher bitrate than the original file', function () {
            return tslib_1.__awaiter(this, void 0, void 0, function* () {
                this.timeout(160000);
                const newConfig = {
                    transcoding: {
                        enabled: true,
                        resolutions: {
                            '240p': true,
                            '360p': true,
                            '480p': true,
                            '720p': true,
                            '1080p': true,
                            '1440p': true,
                            '2160p': true
                        },
                        webtorrent: { enabled: true },
                        hls: { enabled: true }
                    }
                };
                yield servers[1].config.updateCustomSubConfig({ newConfig });
                const attributes = {
                    name: 'low bitrate',
                    fixture: 'low-bitrate.mp4'
                };
                const { id } = yield servers[1].videos.upload({ attributes });
                yield extra_utils_1.waitJobs(servers);
                const video = yield servers[1].videos.get({ id });
                const resolutions = [240, 360, 480, 720, 1080];
                for (const r of resolutions) {
                    const file = video.files.find(f => f.resolution.id === r);
                    const path = servers[1].servers.buildWebTorrentFilePath(file.fileUrl);
                    const bitrate = yield ffprobe_utils_1.getVideoFileBitrate(path);
                    expect(bitrate, `${path} not below ${60000}`).to.be.below(60000);
                }
            });
        });
    });
    describe('FFprobe', function () {
        it('Should provide valid ffprobe data', function () {
            return tslib_1.__awaiter(this, void 0, void 0, function* () {
                this.timeout(160000);
                const videoUUID = (yield servers[1].videos.quickUpload({ name: 'ffprobe data' })).uuid;
                yield extra_utils_1.waitJobs(servers);
                {
                    const video = yield servers[1].videos.get({ id: videoUUID });
                    const file = video.files.find(f => f.resolution.id === 240);
                    const path = servers[1].servers.buildWebTorrentFilePath(file.fileUrl);
                    const metadata = yield ffprobe_utils_1.getMetadataFromFile(path);
                    for (const p of [
                        'tags.encoder',
                        'format_long_name',
                        'size',
                        'bit_rate'
                    ]) {
                        expect(metadata.format).to.have.nested.property(p);
                    }
                    for (const p of [
                        'codec_long_name',
                        'profile',
                        'width',
                        'height',
                        'display_aspect_ratio',
                        'avg_frame_rate',
                        'pix_fmt'
                    ]) {
                        expect(metadata.streams[0]).to.have.nested.property(p);
                    }
                    expect(metadata).to.not.have.nested.property('format.filename');
                }
                for (const server of servers) {
                    const videoDetails = yield server.videos.get({ id: videoUUID });
                    const videoFiles = videoDetails.files
                        .concat(videoDetails.streamingPlaylists[0].files);
                    expect(videoFiles).to.have.lengthOf(8);
                    for (const file of videoFiles) {
                        expect(file.metadata).to.be.undefined;
                        expect(file.metadataUrl).to.exist;
                        expect(file.metadataUrl).to.contain(servers[1].url);
                        expect(file.metadataUrl).to.contain(videoUUID);
                        const metadata = yield server.videos.getFileMetadata({ url: file.metadataUrl });
                        expect(metadata).to.have.nested.property('format.size');
                    }
                }
            });
        });
        it('Should correctly detect if quick transcode is possible', function () {
            return tslib_1.__awaiter(this, void 0, void 0, function* () {
                this.timeout(10000);
                expect(yield ffprobe_utils_1.canDoQuickTranscode(extra_utils_1.buildAbsoluteFixturePath('video_short.mp4'))).to.be.true;
                expect(yield ffprobe_utils_1.canDoQuickTranscode(extra_utils_1.buildAbsoluteFixturePath('video_short.webm'))).to.be.false;
            });
        });
    });
    describe('Transcoding job queue', function () {
        it('Should have the appropriate priorities for transcoding jobs', function () {
            return tslib_1.__awaiter(this, void 0, void 0, function* () {
                const body = yield servers[1].jobs.list({
                    start: 0,
                    count: 100,
                    sort: '-createdAt',
                    jobType: 'video-transcoding'
                });
                const jobs = body.data;
                const transcodingJobs = jobs.filter(j => j.data.videoUUID === video4k);
                expect(transcodingJobs).to.have.lengthOf(14);
                const hlsJobs = transcodingJobs.filter(j => j.data.type === 'new-resolution-to-hls');
                const webtorrentJobs = transcodingJobs.filter(j => j.data.type === 'new-resolution-to-webtorrent');
                const optimizeJobs = transcodingJobs.filter(j => j.data.type === 'optimize-to-webtorrent');
                expect(hlsJobs).to.have.lengthOf(7);
                expect(webtorrentJobs).to.have.lengthOf(6);
                expect(optimizeJobs).to.have.lengthOf(1);
                for (const j of optimizeJobs.concat(hlsJobs.concat(webtorrentJobs))) {
                    expect(j.priority).to.be.greaterThan(100);
                    expect(j.priority).to.be.lessThan(150);
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
