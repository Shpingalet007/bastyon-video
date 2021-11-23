"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VideosRedundancyScheduler = void 0;
const tslib_1 = require("tslib");
const fs_extra_1 = require("fs-extra");
const path_1 = require("path");
const application_1 = require("@server/models/application/application");
const video_1 = require("@server/models/video/video");
const logger_1 = require("../../helpers/logger");
const webtorrent_1 = require("../../helpers/webtorrent");
const config_1 = require("../../initializers/config");
const constants_1 = require("../../initializers/constants");
const video_redundancy_1 = require("../../models/redundancy/video-redundancy");
const send_1 = require("../activitypub/send");
const url_1 = require("../activitypub/url");
const videos_1 = require("../activitypub/videos");
const hls_1 = require("../hls");
const redundancy_1 = require("../redundancy");
const video_urls_1 = require("../video-urls");
const abstract_scheduler_1 = require("./abstract-scheduler");
const lTags = (0, logger_1.loggerTagsFactory)('redundancy');
function isMVideoRedundancyFileVideo(o) {
    return !!o.VideoFile;
}
class VideosRedundancyScheduler extends abstract_scheduler_1.AbstractScheduler {
    constructor() {
        super();
        this.schedulerIntervalMs = config_1.CONFIG.REDUNDANCY.VIDEOS.CHECK_INTERVAL;
    }
    createManualRedundancy(videoId) {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            const videoToDuplicate = yield video_1.VideoModel.loadWithFiles(videoId);
            if (!videoToDuplicate) {
                logger_1.logger.warn('Video to manually duplicate %d does not exist anymore.', videoId, lTags());
                return;
            }
            return this.createVideoRedundancies({
                video: videoToDuplicate,
                redundancy: null,
                files: videoToDuplicate.VideoFiles,
                streamingPlaylists: videoToDuplicate.VideoStreamingPlaylists
            });
        });
    }
    internalExecute() {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            for (const redundancyConfig of config_1.CONFIG.REDUNDANCY.VIDEOS.STRATEGIES) {
                logger_1.logger.info('Running redundancy scheduler for strategy %s.', redundancyConfig.strategy, lTags());
                try {
                    const videoToDuplicate = yield this.findVideoToDuplicate(redundancyConfig);
                    if (!videoToDuplicate)
                        continue;
                    const candidateToDuplicate = {
                        video: videoToDuplicate,
                        redundancy: redundancyConfig,
                        files: videoToDuplicate.VideoFiles,
                        streamingPlaylists: videoToDuplicate.VideoStreamingPlaylists
                    };
                    yield this.purgeCacheIfNeeded(candidateToDuplicate);
                    if (yield this.isTooHeavy(candidateToDuplicate)) {
                        logger_1.logger.info('Video %s is too big for our cache, skipping.', videoToDuplicate.url, lTags(videoToDuplicate.uuid));
                        continue;
                    }
                    logger_1.logger.info('Will duplicate video %s in redundancy scheduler "%s".', videoToDuplicate.url, redundancyConfig.strategy, lTags(videoToDuplicate.uuid));
                    yield this.createVideoRedundancies(candidateToDuplicate);
                }
                catch (err) {
                    logger_1.logger.error('Cannot run videos redundancy %s.', redundancyConfig.strategy, Object.assign({ err }, lTags()));
                }
            }
            yield this.extendsLocalExpiration();
            yield this.purgeRemoteExpired();
        });
    }
    static get Instance() {
        return this.instance || (this.instance = new this());
    }
    extendsLocalExpiration() {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            const expired = yield video_redundancy_1.VideoRedundancyModel.listLocalExpired();
            for (const redundancyModel of expired) {
                try {
                    const redundancyConfig = config_1.CONFIG.REDUNDANCY.VIDEOS.STRATEGIES.find(s => s.strategy === redundancyModel.strategy);
                    const candidate = {
                        redundancy: redundancyConfig,
                        video: null,
                        files: [],
                        streamingPlaylists: []
                    };
                    if (!redundancyConfig || (yield this.isTooHeavy(candidate))) {
                        logger_1.logger.info('Destroying redundancy %s because the cache size %s is too heavy.', redundancyModel.url, redundancyModel.strategy, lTags(candidate.video.uuid));
                        yield (0, redundancy_1.removeVideoRedundancy)(redundancyModel);
                    }
                    else {
                        yield this.extendsRedundancy(redundancyModel);
                    }
                }
                catch (err) {
                    logger_1.logger.error('Cannot extend or remove expiration of %s video from our redundancy system.', this.buildEntryLogId(redundancyModel), Object.assign({ err }, lTags(redundancyModel.getVideoUUID())));
                }
            }
        });
    }
    extendsRedundancy(redundancyModel) {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            const redundancy = config_1.CONFIG.REDUNDANCY.VIDEOS.STRATEGIES.find(s => s.strategy === redundancyModel.strategy);
            if (!redundancy) {
                yield (0, redundancy_1.removeVideoRedundancy)(redundancyModel);
                return;
            }
            yield this.extendsExpirationOf(redundancyModel, redundancy.minLifetime);
        });
    }
    purgeRemoteExpired() {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            const expired = yield video_redundancy_1.VideoRedundancyModel.listRemoteExpired();
            for (const redundancyModel of expired) {
                try {
                    yield (0, redundancy_1.removeVideoRedundancy)(redundancyModel);
                }
                catch (err) {
                    logger_1.logger.error('Cannot remove redundancy %s from our redundancy system.', this.buildEntryLogId(redundancyModel), lTags(redundancyModel.getVideoUUID()));
                }
            }
        });
    }
    findVideoToDuplicate(cache) {
        if (cache.strategy === 'most-views') {
            return video_redundancy_1.VideoRedundancyModel.findMostViewToDuplicate(constants_1.REDUNDANCY.VIDEOS.RANDOMIZED_FACTOR);
        }
        if (cache.strategy === 'trending') {
            return video_redundancy_1.VideoRedundancyModel.findTrendingToDuplicate(constants_1.REDUNDANCY.VIDEOS.RANDOMIZED_FACTOR);
        }
        if (cache.strategy === 'recently-added') {
            const minViews = cache.minViews;
            return video_redundancy_1.VideoRedundancyModel.findRecentlyAddedToDuplicate(constants_1.REDUNDANCY.VIDEOS.RANDOMIZED_FACTOR, minViews);
        }
    }
    createVideoRedundancies(data) {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            const video = yield this.loadAndRefreshVideo(data.video.url);
            if (!video) {
                logger_1.logger.info('Video %s we want to duplicate does not existing anymore, skipping.', data.video.url, lTags(data.video.uuid));
                return;
            }
            for (const file of data.files) {
                const existingRedundancy = yield video_redundancy_1.VideoRedundancyModel.loadLocalByFileId(file.id);
                if (existingRedundancy) {
                    yield this.extendsRedundancy(existingRedundancy);
                    continue;
                }
                yield this.createVideoFileRedundancy(data.redundancy, video, file);
            }
            for (const streamingPlaylist of data.streamingPlaylists) {
                const existingRedundancy = yield video_redundancy_1.VideoRedundancyModel.loadLocalByStreamingPlaylistId(streamingPlaylist.id);
                if (existingRedundancy) {
                    yield this.extendsRedundancy(existingRedundancy);
                    continue;
                }
                yield this.createStreamingPlaylistRedundancy(data.redundancy, video, streamingPlaylist);
            }
        });
    }
    createVideoFileRedundancy(redundancy, video, fileArg) {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            let strategy = 'manual';
            let expiresOn = null;
            if (redundancy) {
                strategy = redundancy.strategy;
                expiresOn = this.buildNewExpiration(redundancy.minLifetime);
            }
            const file = fileArg;
            file.Video = video;
            const serverActor = yield (0, application_1.getServerActor)();
            logger_1.logger.info('Duplicating %s - %d in videos redundancy with "%s" strategy.', video.url, file.resolution, strategy, lTags(video.uuid));
            const tmpPath = yield (0, webtorrent_1.downloadWebTorrentVideo)({ uri: file.torrentUrl }, constants_1.VIDEO_IMPORT_TIMEOUT);
            const destPath = (0, path_1.join)(config_1.CONFIG.STORAGE.REDUNDANCY_DIR, file.filename);
            yield (0, fs_extra_1.move)(tmpPath, destPath, { overwrite: true });
            const createdModel = yield video_redundancy_1.VideoRedundancyModel.create({
                expiresOn,
                url: (0, url_1.getLocalVideoCacheFileActivityPubUrl)(file),
                fileUrl: (0, video_urls_1.generateWebTorrentRedundancyUrl)(file),
                strategy,
                videoFileId: file.id,
                actorId: serverActor.id
            });
            createdModel.VideoFile = file;
            yield (0, send_1.sendCreateCacheFile)(serverActor, video, createdModel);
            logger_1.logger.info('Duplicated %s - %d -> %s.', video.url, file.resolution, createdModel.url, lTags(video.uuid));
        });
    }
    createStreamingPlaylistRedundancy(redundancy, video, playlistArg) {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            let strategy = 'manual';
            let expiresOn = null;
            if (redundancy) {
                strategy = redundancy.strategy;
                expiresOn = this.buildNewExpiration(redundancy.minLifetime);
            }
            const playlist = Object.assign(playlistArg, { Video: video });
            const serverActor = yield (0, application_1.getServerActor)();
            logger_1.logger.info('Duplicating %s streaming playlist in videos redundancy with "%s" strategy.', video.url, strategy, lTags(video.uuid));
            const destDirectory = (0, path_1.join)(constants_1.HLS_REDUNDANCY_DIRECTORY, video.uuid);
            const masterPlaylistUrl = playlist.getMasterPlaylistUrl(video);
            const maxSizeKB = this.getTotalFileSizes([], [playlist]) / 1000;
            const toleranceKB = maxSizeKB + ((5 * maxSizeKB) / 100);
            yield (0, hls_1.downloadPlaylistSegments)(masterPlaylistUrl, destDirectory, constants_1.VIDEO_IMPORT_TIMEOUT, toleranceKB);
            const createdModel = yield video_redundancy_1.VideoRedundancyModel.create({
                expiresOn,
                url: (0, url_1.getLocalVideoCacheStreamingPlaylistActivityPubUrl)(video, playlist),
                fileUrl: (0, video_urls_1.generateHLSRedundancyUrl)(video, playlistArg),
                strategy,
                videoStreamingPlaylistId: playlist.id,
                actorId: serverActor.id
            });
            createdModel.VideoStreamingPlaylist = playlist;
            yield (0, send_1.sendCreateCacheFile)(serverActor, video, createdModel);
            logger_1.logger.info('Duplicated playlist %s -> %s.', masterPlaylistUrl, createdModel.url, lTags(video.uuid));
        });
    }
    extendsExpirationOf(redundancy, expiresAfterMs) {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            logger_1.logger.info('Extending expiration of %s.', redundancy.url, lTags(redundancy.getVideoUUID()));
            const serverActor = yield (0, application_1.getServerActor)();
            redundancy.expiresOn = this.buildNewExpiration(expiresAfterMs);
            yield redundancy.save();
            yield (0, send_1.sendUpdateCacheFile)(serverActor, redundancy);
        });
    }
    purgeCacheIfNeeded(candidateToDuplicate) {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            while (yield this.isTooHeavy(candidateToDuplicate)) {
                const redundancy = candidateToDuplicate.redundancy;
                const toDelete = yield video_redundancy_1.VideoRedundancyModel.loadOldestLocalExpired(redundancy.strategy, redundancy.minLifetime);
                if (!toDelete)
                    return;
                const videoId = toDelete.VideoFile
                    ? toDelete.VideoFile.videoId
                    : toDelete.VideoStreamingPlaylist.videoId;
                const redundancies = yield video_redundancy_1.VideoRedundancyModel.listLocalByVideoId(videoId);
                for (const redundancy of redundancies) {
                    yield (0, redundancy_1.removeVideoRedundancy)(redundancy);
                }
            }
        });
    }
    isTooHeavy(candidateToDuplicate) {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            const maxSize = candidateToDuplicate.redundancy.size;
            const { totalUsed: alreadyUsed } = yield video_redundancy_1.VideoRedundancyModel.getStats(candidateToDuplicate.redundancy.strategy);
            const videoSize = this.getTotalFileSizes(candidateToDuplicate.files, candidateToDuplicate.streamingPlaylists);
            const willUse = alreadyUsed + videoSize;
            logger_1.logger.debug('Checking candidate size.', Object.assign({ maxSize, alreadyUsed, videoSize, willUse }, lTags(candidateToDuplicate.video.uuid)));
            return willUse > maxSize;
        });
    }
    buildNewExpiration(expiresAfterMs) {
        return new Date(Date.now() + expiresAfterMs);
    }
    buildEntryLogId(object) {
        if (isMVideoRedundancyFileVideo(object))
            return `${object.VideoFile.Video.url}-${object.VideoFile.resolution}`;
        return `${object.VideoStreamingPlaylist.getMasterPlaylistUrl(object.VideoStreamingPlaylist.Video)}`;
    }
    getTotalFileSizes(files, playlists) {
        const fileReducer = (previous, current) => previous + current.size;
        let allFiles = files;
        for (const p of playlists) {
            allFiles = allFiles.concat(p.VideoFiles);
        }
        return allFiles.reduce(fileReducer, 0);
    }
    loadAndRefreshVideo(videoUrl) {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            const getVideoOptions = {
                videoObject: videoUrl,
                syncParam: { likes: false, dislikes: false, shares: false, comments: false, thumbnail: false, refreshVideo: true },
                fetchType: 'all'
            };
            const { video } = yield (0, videos_1.getOrCreateAPVideo)(getVideoOptions);
            return video;
        });
    }
}
exports.VideosRedundancyScheduler = VideosRedundancyScheduler;
