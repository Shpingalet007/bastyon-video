"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.myVideoPlaylistsRouter = void 0;
const tslib_1 = require("tslib");
const express_1 = (0, tslib_1.__importDefault)(require("express"));
const middlewares_1 = require("../../../middlewares");
const video_playlists_1 = require("../../../middlewares/validators/videos/video-playlists");
const video_playlist_1 = require("../../../models/video/video-playlist");
const myVideoPlaylistsRouter = express_1.default.Router();
exports.myVideoPlaylistsRouter = myVideoPlaylistsRouter;
myVideoPlaylistsRouter.get('/me/video-playlists/videos-exist', middlewares_1.authenticate, video_playlists_1.doVideosInPlaylistExistValidator, (0, middlewares_1.asyncMiddleware)(doVideosInPlaylistExist));
function doVideosInPlaylistExist(req, res) {
    return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
        const videoIds = req.query.videoIds.map(i => parseInt(i + '', 10));
        const user = res.locals.oauth.token.User;
        const results = yield video_playlist_1.VideoPlaylistModel.listPlaylistIdsOf(user.Account.id, videoIds);
        const existObject = {};
        for (const videoId of videoIds) {
            existObject[videoId] = [];
        }
        for (const result of results) {
            for (const element of result.VideoPlaylistElements) {
                existObject[element.videoId].push({
                    playlistElementId: element.id,
                    playlistId: result.id,
                    startTimestamp: element.startTimestamp,
                    stopTimestamp: element.stopTimestamp
                });
            }
        }
        return res.json(existObject);
    });
}
