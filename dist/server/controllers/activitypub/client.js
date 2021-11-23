"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activityPubClientRouter = void 0;
const tslib_1 = require("tslib");
const cors_1 = (0, tslib_1.__importDefault)(require("cors"));
const express_1 = (0, tslib_1.__importDefault)(require("express"));
const application_1 = require("@server/models/application/application");
const activitypub_1 = require("../../helpers/activitypub");
const constants_1 = require("../../initializers/constants");
const audience_1 = require("../../lib/activitypub/audience");
const send_1 = require("../../lib/activitypub/send");
const send_create_1 = require("../../lib/activitypub/send/send-create");
const send_dislike_1 = require("../../lib/activitypub/send/send-dislike");
const url_1 = require("../../lib/activitypub/url");
const middlewares_1 = require("../../middlewares");
const cache_1 = require("../../middlewares/cache/cache");
const validators_1 = require("../../middlewares/validators");
const redundancy_1 = require("../../middlewares/validators/redundancy");
const video_playlists_1 = require("../../middlewares/validators/videos/video-playlists");
const account_1 = require("../../models/account/account");
const account_video_rate_1 = require("../../models/account/account-video-rate");
const actor_follow_1 = require("../../models/actor/actor-follow");
const video_caption_1 = require("../../models/video/video-caption");
const video_comment_1 = require("../../models/video/video-comment");
const video_playlist_1 = require("../../models/video/video-playlist");
const video_share_1 = require("../../models/video/video-share");
const utils_1 = require("./utils");
const activityPubClientRouter = express_1.default.Router();
exports.activityPubClientRouter = activityPubClientRouter;
activityPubClientRouter.use((0, cors_1.default)());
activityPubClientRouter.get(['/accounts?/:name', '/accounts?/:name/video-channels', '/a/:name', '/a/:name/video-channels'], middlewares_1.executeIfActivityPub, (0, middlewares_1.asyncMiddleware)(middlewares_1.localAccountValidator), accountController);
activityPubClientRouter.get('/accounts?/:name/followers', middlewares_1.executeIfActivityPub, (0, middlewares_1.asyncMiddleware)(middlewares_1.localAccountValidator), (0, middlewares_1.asyncMiddleware)(accountFollowersController));
activityPubClientRouter.get('/accounts?/:name/following', middlewares_1.executeIfActivityPub, (0, middlewares_1.asyncMiddleware)(middlewares_1.localAccountValidator), (0, middlewares_1.asyncMiddleware)(accountFollowingController));
activityPubClientRouter.get('/accounts?/:name/playlists', middlewares_1.executeIfActivityPub, (0, middlewares_1.asyncMiddleware)(middlewares_1.localAccountValidator), (0, middlewares_1.asyncMiddleware)(accountPlaylistsController));
activityPubClientRouter.get('/accounts?/:name/likes/:videoId', middlewares_1.executeIfActivityPub, (0, middlewares_1.asyncMiddleware)((0, validators_1.getAccountVideoRateValidatorFactory)('like')), getAccountVideoRateFactory('like'));
activityPubClientRouter.get('/accounts?/:name/dislikes/:videoId', middlewares_1.executeIfActivityPub, (0, middlewares_1.asyncMiddleware)((0, validators_1.getAccountVideoRateValidatorFactory)('dislike')), getAccountVideoRateFactory('dislike'));
activityPubClientRouter.get(['/videos/watch/:id', '/w/:id'], middlewares_1.executeIfActivityPub, (0, cache_1.cacheRoute)(constants_1.ROUTE_CACHE_LIFETIME.ACTIVITY_PUB.VIDEOS), (0, middlewares_1.asyncMiddleware)((0, middlewares_1.videosCustomGetValidator)('all')), (0, middlewares_1.asyncMiddleware)(videoController));
activityPubClientRouter.get('/videos/watch/:id/activity', middlewares_1.executeIfActivityPub, (0, middlewares_1.asyncMiddleware)((0, middlewares_1.videosCustomGetValidator)('all')), (0, middlewares_1.asyncMiddleware)(videoController));
activityPubClientRouter.get('/videos/watch/:id/announces', middlewares_1.executeIfActivityPub, (0, middlewares_1.asyncMiddleware)((0, middlewares_1.videosCustomGetValidator)('only-immutable-attributes')), (0, middlewares_1.asyncMiddleware)(videoAnnouncesController));
activityPubClientRouter.get('/videos/watch/:id/announces/:actorId', middlewares_1.executeIfActivityPub, (0, middlewares_1.asyncMiddleware)(middlewares_1.videosShareValidator), (0, middlewares_1.asyncMiddleware)(videoAnnounceController));
activityPubClientRouter.get('/videos/watch/:id/likes', middlewares_1.executeIfActivityPub, (0, middlewares_1.asyncMiddleware)((0, middlewares_1.videosCustomGetValidator)('only-immutable-attributes')), (0, middlewares_1.asyncMiddleware)(videoLikesController));
activityPubClientRouter.get('/videos/watch/:id/dislikes', middlewares_1.executeIfActivityPub, (0, middlewares_1.asyncMiddleware)((0, middlewares_1.videosCustomGetValidator)('only-immutable-attributes')), (0, middlewares_1.asyncMiddleware)(videoDislikesController));
activityPubClientRouter.get('/videos/watch/:id/comments', middlewares_1.executeIfActivityPub, (0, middlewares_1.asyncMiddleware)((0, middlewares_1.videosCustomGetValidator)('only-immutable-attributes')), (0, middlewares_1.asyncMiddleware)(videoCommentsController));
activityPubClientRouter.get('/videos/watch/:videoId/comments/:commentId', middlewares_1.executeIfActivityPub, (0, middlewares_1.asyncMiddleware)(validators_1.videoCommentGetValidator), (0, middlewares_1.asyncMiddleware)(videoCommentController));
activityPubClientRouter.get('/videos/watch/:videoId/comments/:commentId/activity', middlewares_1.executeIfActivityPub, (0, middlewares_1.asyncMiddleware)(validators_1.videoCommentGetValidator), (0, middlewares_1.asyncMiddleware)(videoCommentController));
activityPubClientRouter.get(['/video-channels/:name', '/video-channels/:name/videos', '/c/:name', '/c/:name/videos'], middlewares_1.executeIfActivityPub, (0, middlewares_1.asyncMiddleware)(middlewares_1.localVideoChannelValidator), videoChannelController);
activityPubClientRouter.get('/video-channels/:name/followers', middlewares_1.executeIfActivityPub, (0, middlewares_1.asyncMiddleware)(middlewares_1.localVideoChannelValidator), (0, middlewares_1.asyncMiddleware)(videoChannelFollowersController));
activityPubClientRouter.get('/video-channels/:name/following', middlewares_1.executeIfActivityPub, (0, middlewares_1.asyncMiddleware)(middlewares_1.localVideoChannelValidator), (0, middlewares_1.asyncMiddleware)(videoChannelFollowingController));
activityPubClientRouter.get('/video-channels/:name/playlists', middlewares_1.executeIfActivityPub, (0, middlewares_1.asyncMiddleware)(middlewares_1.localVideoChannelValidator), (0, middlewares_1.asyncMiddleware)(videoChannelPlaylistsController));
activityPubClientRouter.get('/redundancy/videos/:videoId/:resolution([0-9]+)(-:fps([0-9]+))?', middlewares_1.executeIfActivityPub, (0, middlewares_1.asyncMiddleware)(redundancy_1.videoFileRedundancyGetValidator), (0, middlewares_1.asyncMiddleware)(videoRedundancyController));
activityPubClientRouter.get('/redundancy/streaming-playlists/:streamingPlaylistType/:videoId', middlewares_1.executeIfActivityPub, (0, middlewares_1.asyncMiddleware)(redundancy_1.videoPlaylistRedundancyGetValidator), (0, middlewares_1.asyncMiddleware)(videoRedundancyController));
activityPubClientRouter.get(['/video-playlists/:playlistId', '/videos/watch/playlist/:playlistId', '/w/p/:playlistId'], middlewares_1.executeIfActivityPub, (0, middlewares_1.asyncMiddleware)((0, video_playlists_1.videoPlaylistsGetValidator)('all')), (0, middlewares_1.asyncMiddleware)(videoPlaylistController));
activityPubClientRouter.get('/video-playlists/:playlistId/videos/:playlistElementId', middlewares_1.executeIfActivityPub, (0, middlewares_1.asyncMiddleware)(video_playlists_1.videoPlaylistElementAPGetValidator), videoPlaylistElementController);
function accountController(req, res) {
    const account = res.locals.account;
    return (0, utils_1.activityPubResponse)((0, activitypub_1.activityPubContextify)(account.toActivityPubObject()), res);
}
function accountFollowersController(req, res) {
    return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
        const account = res.locals.account;
        const activityPubResult = yield actorFollowers(req, account.Actor);
        return (0, utils_1.activityPubResponse)((0, activitypub_1.activityPubContextify)(activityPubResult), res);
    });
}
function accountFollowingController(req, res) {
    return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
        const account = res.locals.account;
        const activityPubResult = yield actorFollowing(req, account.Actor);
        return (0, utils_1.activityPubResponse)((0, activitypub_1.activityPubContextify)(activityPubResult), res);
    });
}
function accountPlaylistsController(req, res) {
    return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
        const account = res.locals.account;
        const activityPubResult = yield actorPlaylists(req, { account });
        return (0, utils_1.activityPubResponse)((0, activitypub_1.activityPubContextify)(activityPubResult), res);
    });
}
function videoChannelPlaylistsController(req, res) {
    return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
        const channel = res.locals.videoChannel;
        const activityPubResult = yield actorPlaylists(req, { channel });
        return (0, utils_1.activityPubResponse)((0, activitypub_1.activityPubContextify)(activityPubResult), res);
    });
}
function getAccountVideoRateFactory(rateType) {
    return (req, res) => {
        const accountVideoRate = res.locals.accountVideoRate;
        const byActor = accountVideoRate.Account.Actor;
        const APObject = rateType === 'like'
            ? (0, send_1.buildLikeActivity)(accountVideoRate.url, byActor, accountVideoRate.Video)
            : (0, send_dislike_1.buildDislikeActivity)(accountVideoRate.url, byActor, accountVideoRate.Video);
        return (0, utils_1.activityPubResponse)((0, activitypub_1.activityPubContextify)(APObject), res);
    };
}
function videoController(req, res) {
    return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
        const video = res.locals.videoAll;
        if (redirectIfNotOwned(video.url, res))
            return;
        const captions = yield video_caption_1.VideoCaptionModel.listVideoCaptions(video.id);
        const videoWithCaptions = Object.assign(video, { VideoCaptions: captions });
        const audience = (0, audience_1.getAudience)(videoWithCaptions.VideoChannel.Account.Actor, videoWithCaptions.privacy === 1);
        const videoObject = (0, audience_1.audiencify)(videoWithCaptions.toActivityPubObject(), audience);
        if (req.path.endsWith('/activity')) {
            const data = (0, send_create_1.buildCreateActivity)(videoWithCaptions.url, video.VideoChannel.Account.Actor, videoObject, audience);
            return (0, utils_1.activityPubResponse)((0, activitypub_1.activityPubContextify)(data), res);
        }
        return (0, utils_1.activityPubResponse)((0, activitypub_1.activityPubContextify)(videoObject), res);
    });
}
function videoAnnounceController(req, res) {
    return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
        const share = res.locals.videoShare;
        if (redirectIfNotOwned(share.url, res))
            return;
        const { activity } = yield (0, send_1.buildAnnounceWithVideoAudience)(share.Actor, share, res.locals.videoAll, undefined);
        return (0, utils_1.activityPubResponse)((0, activitypub_1.activityPubContextify)(activity, 'Announce'), res);
    });
}
function videoAnnouncesController(req, res) {
    return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
        const video = res.locals.onlyImmutableVideo;
        if (redirectIfNotOwned(video.url, res))
            return;
        const handler = (start, count) => (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            const result = yield video_share_1.VideoShareModel.listAndCountByVideoId(video.id, start, count);
            return {
                total: result.count,
                data: result.rows.map(r => r.url)
            };
        });
        const json = yield (0, activitypub_1.activityPubCollectionPagination)((0, url_1.getLocalVideoSharesActivityPubUrl)(video), handler, req.query.page);
        return (0, utils_1.activityPubResponse)((0, activitypub_1.activityPubContextify)(json), res);
    });
}
function videoLikesController(req, res) {
    return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
        const video = res.locals.onlyImmutableVideo;
        if (redirectIfNotOwned(video.url, res))
            return;
        const json = yield videoRates(req, 'like', video, (0, url_1.getLocalVideoLikesActivityPubUrl)(video));
        return (0, utils_1.activityPubResponse)((0, activitypub_1.activityPubContextify)(json), res);
    });
}
function videoDislikesController(req, res) {
    return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
        const video = res.locals.onlyImmutableVideo;
        if (redirectIfNotOwned(video.url, res))
            return;
        const json = yield videoRates(req, 'dislike', video, (0, url_1.getLocalVideoDislikesActivityPubUrl)(video));
        return (0, utils_1.activityPubResponse)((0, activitypub_1.activityPubContextify)(json), res);
    });
}
function videoCommentsController(req, res) {
    return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
        const video = res.locals.onlyImmutableVideo;
        if (redirectIfNotOwned(video.url, res))
            return;
        const handler = (start, count) => (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            const result = yield video_comment_1.VideoCommentModel.listAndCountByVideoForAP(video, start, count);
            return {
                total: result.count,
                data: result.rows.map(r => r.url)
            };
        });
        const json = yield (0, activitypub_1.activityPubCollectionPagination)((0, url_1.getLocalVideoCommentsActivityPubUrl)(video), handler, req.query.page);
        return (0, utils_1.activityPubResponse)((0, activitypub_1.activityPubContextify)(json), res);
    });
}
function videoChannelController(req, res) {
    const videoChannel = res.locals.videoChannel;
    return (0, utils_1.activityPubResponse)((0, activitypub_1.activityPubContextify)(videoChannel.toActivityPubObject()), res);
}
function videoChannelFollowersController(req, res) {
    return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
        const videoChannel = res.locals.videoChannel;
        const activityPubResult = yield actorFollowers(req, videoChannel.Actor);
        return (0, utils_1.activityPubResponse)((0, activitypub_1.activityPubContextify)(activityPubResult), res);
    });
}
function videoChannelFollowingController(req, res) {
    return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
        const videoChannel = res.locals.videoChannel;
        const activityPubResult = yield actorFollowing(req, videoChannel.Actor);
        return (0, utils_1.activityPubResponse)((0, activitypub_1.activityPubContextify)(activityPubResult), res);
    });
}
function videoCommentController(req, res) {
    return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
        const videoComment = res.locals.videoCommentFull;
        if (redirectIfNotOwned(videoComment.url, res))
            return;
        const threadParentComments = yield video_comment_1.VideoCommentModel.listThreadParentComments(videoComment, undefined);
        const isPublic = true;
        let videoCommentObject = videoComment.toActivityPubObject(threadParentComments);
        if (videoComment.Account) {
            const audience = (0, audience_1.getAudience)(videoComment.Account.Actor, isPublic);
            videoCommentObject = (0, audience_1.audiencify)(videoCommentObject, audience);
            if (req.path.endsWith('/activity')) {
                const data = (0, send_create_1.buildCreateActivity)(videoComment.url, videoComment.Account.Actor, videoCommentObject, audience);
                return (0, utils_1.activityPubResponse)((0, activitypub_1.activityPubContextify)(data), res);
            }
        }
        return (0, utils_1.activityPubResponse)((0, activitypub_1.activityPubContextify)(videoCommentObject), res);
    });
}
function videoRedundancyController(req, res) {
    return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
        const videoRedundancy = res.locals.videoRedundancy;
        if (redirectIfNotOwned(videoRedundancy.url, res))
            return;
        const serverActor = yield (0, application_1.getServerActor)();
        const audience = (0, audience_1.getAudience)(serverActor);
        const object = (0, audience_1.audiencify)(videoRedundancy.toActivityPubObject(), audience);
        if (req.path.endsWith('/activity')) {
            const data = (0, send_create_1.buildCreateActivity)(videoRedundancy.url, serverActor, object, audience);
            return (0, utils_1.activityPubResponse)((0, activitypub_1.activityPubContextify)(data, 'CacheFile'), res);
        }
        return (0, utils_1.activityPubResponse)((0, activitypub_1.activityPubContextify)(object, 'CacheFile'), res);
    });
}
function videoPlaylistController(req, res) {
    return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
        const playlist = res.locals.videoPlaylistFull;
        if (redirectIfNotOwned(playlist.url, res))
            return;
        playlist.OwnerAccount = yield account_1.AccountModel.load(playlist.ownerAccountId);
        const json = yield playlist.toActivityPubObject(req.query.page, null);
        const audience = (0, audience_1.getAudience)(playlist.OwnerAccount.Actor, playlist.privacy === 1);
        const object = (0, audience_1.audiencify)(json, audience);
        return (0, utils_1.activityPubResponse)((0, activitypub_1.activityPubContextify)(object), res);
    });
}
function videoPlaylistElementController(req, res) {
    const videoPlaylistElement = res.locals.videoPlaylistElementAP;
    if (redirectIfNotOwned(videoPlaylistElement.url, res))
        return;
    const json = videoPlaylistElement.toActivityPubObject();
    return (0, utils_1.activityPubResponse)((0, activitypub_1.activityPubContextify)(json), res);
}
function actorFollowing(req, actor) {
    return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
        const handler = (start, count) => {
            return actor_follow_1.ActorFollowModel.listAcceptedFollowingUrlsForApi([actor.id], undefined, start, count);
        };
        return (0, activitypub_1.activityPubCollectionPagination)(constants_1.WEBSERVER.URL + req.path, handler, req.query.page);
    });
}
function actorFollowers(req, actor) {
    return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
        const handler = (start, count) => {
            return actor_follow_1.ActorFollowModel.listAcceptedFollowerUrlsForAP([actor.id], undefined, start, count);
        };
        return (0, activitypub_1.activityPubCollectionPagination)(constants_1.WEBSERVER.URL + req.path, handler, req.query.page);
    });
}
function actorPlaylists(req, options) {
    return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
        const handler = (start, count) => {
            return video_playlist_1.VideoPlaylistModel.listPublicUrlsOfForAP(options, start, count);
        };
        return (0, activitypub_1.activityPubCollectionPagination)(constants_1.WEBSERVER.URL + req.path, handler, req.query.page);
    });
}
function videoRates(req, rateType, video, url) {
    const handler = (start, count) => (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
        const result = yield account_video_rate_1.AccountVideoRateModel.listAndCountAccountUrlsByVideoId(rateType, video.id, start, count);
        return {
            total: result.count,
            data: result.rows.map(r => r.url)
        };
    });
    return (0, activitypub_1.activityPubCollectionPagination)(url, handler, req.query.page);
}
function redirectIfNotOwned(url, res) {
    if (url.startsWith(constants_1.WEBSERVER.URL) === false) {
        res.redirect(url);
        return true;
    }
    return false;
}
