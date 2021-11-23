"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VideosTorrentCache = void 0;
const tslib_1 = require("tslib");
const path_1 = require("path");
const requests_1 = require("@server/helpers/requests");
const video_file_1 = require("@server/models/video/video-file");
const config_1 = require("../../initializers/config");
const constants_1 = require("../../initializers/constants");
const video_1 = require("../../models/video/video");
const abstract_video_static_file_cache_1 = require("./abstract-video-static-file-cache");
class VideosTorrentCache extends abstract_video_static_file_cache_1.AbstractVideoStaticFileCache {
    constructor() {
        super();
    }
    static get Instance() {
        return this.instance || (this.instance = new this());
    }
    getFilePathImpl(filename) {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            const file = yield video_file_1.VideoFileModel.loadWithVideoOrPlaylistByTorrentFilename(filename);
            if (!file)
                return undefined;
            if (file.getVideo().isOwned()) {
                const downloadName = this.buildDownloadName(file.getVideo(), file);
                return { isOwned: true, path: (0, path_1.join)(config_1.CONFIG.STORAGE.TORRENTS_DIR, file.torrentFilename), downloadName };
            }
            return this.loadRemoteFile(filename);
        });
    }
    loadRemoteFile(key) {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            const file = yield video_file_1.VideoFileModel.loadWithVideoOrPlaylistByTorrentFilename(key);
            if (!file)
                return undefined;
            if (file.getVideo().isOwned())
                throw new Error('Cannot load remote file of owned video.');
            const video = yield video_1.VideoModel.loadAndPopulateAccountAndServerAndTags(file.getVideo().id);
            if (!video)
                return undefined;
            const remoteUrl = file.getRemoteTorrentUrl(video);
            const destPath = (0, path_1.join)(constants_1.FILES_CACHE.TORRENTS.DIRECTORY, file.torrentFilename);
            yield (0, requests_1.doRequestAndSaveToFile)(remoteUrl, destPath);
            const downloadName = this.buildDownloadName(video, file);
            return { isOwned: false, path: destPath, downloadName };
        });
    }
    buildDownloadName(video, file) {
        return `${video.name}-${file.resolution}p.torrent`;
    }
}
exports.VideosTorrentCache = VideosTorrentCache;
