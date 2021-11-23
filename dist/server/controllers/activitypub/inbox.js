"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inboxRouter = void 0;
const tslib_1 = require("tslib");
const express_1 = (0, tslib_1.__importDefault)(require("express"));
const inbox_manager_1 = require("@server/lib/activitypub/inbox-manager");
const http_error_codes_1 = require("../../../shared/models/http/http-error-codes");
const activity_1 = require("../../helpers/custom-validators/activitypub/activity");
const logger_1 = require("../../helpers/logger");
const middlewares_1 = require("../../middlewares");
const activity_2 = require("../../middlewares/validators/activitypub/activity");
const inboxRouter = express_1.default.Router();
exports.inboxRouter = inboxRouter;
inboxRouter.post('/inbox', middlewares_1.signatureValidator, (0, middlewares_1.asyncMiddleware)(middlewares_1.checkSignature), (0, middlewares_1.asyncMiddleware)(activity_2.activityPubValidator), inboxController);
inboxRouter.post('/accounts/:name/inbox', middlewares_1.signatureValidator, (0, middlewares_1.asyncMiddleware)(middlewares_1.checkSignature), (0, middlewares_1.asyncMiddleware)(middlewares_1.localAccountValidator), (0, middlewares_1.asyncMiddleware)(activity_2.activityPubValidator), inboxController);
inboxRouter.post('/video-channels/:name/inbox', middlewares_1.signatureValidator, (0, middlewares_1.asyncMiddleware)(middlewares_1.checkSignature), (0, middlewares_1.asyncMiddleware)(middlewares_1.localVideoChannelValidator), (0, middlewares_1.asyncMiddleware)(activity_2.activityPubValidator), inboxController);
function inboxController(req, res) {
    const rootActivity = req.body;
    let activities;
    if (['Collection', 'CollectionPage'].includes(rootActivity.type)) {
        activities = rootActivity.items;
    }
    else if (['OrderedCollection', 'OrderedCollectionPage'].includes(rootActivity.type)) {
        activities = rootActivity.orderedItems;
    }
    else {
        activities = [rootActivity];
    }
    logger_1.logger.debug('Filtering %d activities...', activities.length);
    activities = activities.filter(a => (0, activity_1.isActivityValid)(a));
    logger_1.logger.debug('We keep %d activities.', activities.length, { activities });
    const accountOrChannel = res.locals.account || res.locals.videoChannel;
    logger_1.logger.info('Receiving inbox requests for %d activities by %s.', activities.length, res.locals.signature.actor.url);
    inbox_manager_1.InboxManager.Instance.addInboxMessage({
        activities,
        signatureActor: res.locals.signature.actor,
        inboxActor: accountOrChannel
            ? accountOrChannel.Actor
            : undefined
    });
    return res.status(http_error_codes_1.HttpStatusCode.NO_CONTENT_204).end();
}
