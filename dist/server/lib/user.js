"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAbleToUploadVideo = exports.sendVerifyUserEmail = exports.createLocalAccountWithoutKeys = exports.createUserAccountAndChannelAndPlaylist = exports.createApplicationActor = exports.getOriginalVideoFileTotalDailyFromUser = exports.getOriginalVideoFileTotalFromUser = void 0;
const tslib_1 = require("tslib");
const uuid_1 = require("@server/helpers/uuid");
const user_1 = require("@server/models/user/user");
const constants_1 = require("../initializers/constants");
const database_1 = require("../initializers/database");
const account_1 = require("../models/account/account");
const actor_1 = require("../models/actor/actor");
const user_notification_setting_1 = require("../models/user/user-notification-setting");
const actors_1 = require("./activitypub/actors");
const url_1 = require("./activitypub/url");
const emailer_1 = require("./emailer");
const live_quota_store_1 = require("./live/live-quota-store");
const local_actor_1 = require("./local-actor");
const redis_1 = require("./redis");
const video_channel_1 = require("./video-channel");
const video_playlist_1 = require("./video-playlist");
function createUserAccountAndChannelAndPlaylist(parameters) {
    return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
        const { userToCreate, userDisplayName, channelNames, validateUser = true } = parameters;
        const { user, account, videoChannel } = yield database_1.sequelizeTypescript.transaction((t) => (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            const userOptions = {
                transaction: t,
                validate: validateUser
            };
            const userCreated = yield userToCreate.save(userOptions);
            userCreated.NotificationSetting = yield createDefaultUserNotificationSettings(userCreated, t);
            const accountCreated = yield createLocalAccountWithoutKeys({
                name: userCreated.username,
                displayName: userDisplayName,
                userId: userCreated.id,
                applicationId: null,
                t
            });
            userCreated.Account = accountCreated;
            const channelAttributes = yield buildChannelAttributes(userCreated, t, channelNames);
            const videoChannel = yield (0, video_channel_1.createLocalVideoChannel)(channelAttributes, accountCreated, t);
            const videoPlaylist = yield (0, video_playlist_1.createWatchLaterPlaylist)(accountCreated, t);
            return { user: userCreated, account: accountCreated, videoChannel, videoPlaylist };
        }));
        const [accountActorWithKeys, channelActorWithKeys] = yield Promise.all([
            (0, actors_1.generateAndSaveActorKeys)(account.Actor),
            (0, actors_1.generateAndSaveActorKeys)(videoChannel.Actor)
        ]);
        account.Actor = accountActorWithKeys;
        videoChannel.Actor = channelActorWithKeys;
        return { user, account, videoChannel };
    });
}
exports.createUserAccountAndChannelAndPlaylist = createUserAccountAndChannelAndPlaylist;
function createLocalAccountWithoutKeys(parameters) {
    return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
        const { name, displayName, userId, applicationId, t, type = 'Person' } = parameters;
        const url = (0, url_1.getLocalAccountActivityPubUrl)(name);
        const actorInstance = (0, local_actor_1.buildActorInstance)(type, url, name);
        const actorInstanceCreated = yield actorInstance.save({ transaction: t });
        const accountInstance = new account_1.AccountModel({
            name: displayName || name,
            userId,
            applicationId,
            actorId: actorInstanceCreated.id
        });
        const accountInstanceCreated = yield accountInstance.save({ transaction: t });
        accountInstanceCreated.Actor = actorInstanceCreated;
        return accountInstanceCreated;
    });
}
exports.createLocalAccountWithoutKeys = createLocalAccountWithoutKeys;
function createApplicationActor(applicationId) {
    return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
        const accountCreated = yield createLocalAccountWithoutKeys({
            name: constants_1.SERVER_ACTOR_NAME,
            userId: null,
            applicationId: applicationId,
            t: undefined,
            type: 'Application'
        });
        accountCreated.Actor = yield (0, actors_1.generateAndSaveActorKeys)(accountCreated.Actor);
        return accountCreated;
    });
}
exports.createApplicationActor = createApplicationActor;
function sendVerifyUserEmail(user, isPendingEmail = false) {
    return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
        const verificationString = yield redis_1.Redis.Instance.setVerifyEmailVerificationString(user.id);
        let url = constants_1.WEBSERVER.URL + '/verify-account/email?userId=' + user.id + '&verificationString=' + verificationString;
        if (isPendingEmail)
            url += '&isPendingEmail=true';
        const email = isPendingEmail ? user.pendingEmail : user.email;
        const username = user.username;
        yield emailer_1.Emailer.Instance.addVerifyEmailJob(username, email, url);
    });
}
exports.sendVerifyUserEmail = sendVerifyUserEmail;
function getOriginalVideoFileTotalFromUser(user) {
    return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
        const query = user_1.UserModel.generateUserQuotaBaseSQL({
            withSelect: true,
            whereUserId: '$userId'
        }, user);
        const base = yield user_1.UserModel.getTotalRawQuery(query, user.id);
        return base + live_quota_store_1.LiveQuotaStore.Instance.getLiveQuotaOf(user.id);
    });
}
exports.getOriginalVideoFileTotalFromUser = getOriginalVideoFileTotalFromUser;
function getOriginalVideoFileTotalDailyFromUser(user) {
    return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
        const query = user_1.UserModel.generateUserQuotaBaseSQL({
            withSelect: true,
            whereUserId: '$userId',
            where: '"video"."createdAt" > now() - interval \'24 hours\''
        }, user);
        const base = yield user_1.UserModel.getTotalRawQuery(query, user.id);
        return base + live_quota_store_1.LiveQuotaStore.Instance.getLiveQuotaOf(user.id);
    });
}
exports.getOriginalVideoFileTotalDailyFromUser = getOriginalVideoFileTotalDailyFromUser;
function isAbleToUploadVideo(userId, newVideoSize) {
    return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
        const user = yield user_1.UserModel.loadById(userId);
        if (user.videoQuota === -1 && user.videoQuotaDaily === -1)
            return Promise.resolve(true);
        const [totalBytes, totalBytesDaily] = yield Promise.all([
            getOriginalVideoFileTotalFromUser(user),
            getOriginalVideoFileTotalDailyFromUser(user)
        ]);
        const uploadedTotal = newVideoSize + totalBytes;
        const uploadedDaily = newVideoSize + totalBytesDaily;
        if (user.videoQuotaDaily === -1)
            return uploadedTotal < user.videoQuota;
        if (user.videoQuota === -1)
            return uploadedDaily < user.videoQuotaDaily;
        return uploadedTotal < user.videoQuota && uploadedDaily < user.videoQuotaDaily;
    });
}
exports.isAbleToUploadVideo = isAbleToUploadVideo;
function createDefaultUserNotificationSettings(user, t) {
    const values = {
        userId: user.id,
        newVideoFromSubscription: 1,
        newCommentOnMyVideo: 1,
        myVideoImportFinished: 1,
        myVideoPublished: 1,
        abuseAsModerator: 1 | 2,
        videoAutoBlacklistAsModerator: 1 | 2,
        blacklistOnMyVideo: 1 | 2,
        newUserRegistration: 1,
        commentMention: 1,
        newFollow: 1,
        newInstanceFollower: 1,
        abuseNewMessage: 1 | 2,
        abuseStateChange: 1 | 2,
        autoInstanceFollowing: 1,
        newPeerTubeVersion: 1 | 2,
        newPluginVersion: 1
    };
    return user_notification_setting_1.UserNotificationSettingModel.create(values, { transaction: t });
}
function buildChannelAttributes(user, transaction, channelNames) {
    return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
        if (channelNames)
            return channelNames;
        let channelName = user.username + '_channel';
        const actor = yield actor_1.ActorModel.loadLocalByName(channelName, transaction);
        if (actor)
            channelName = (0, uuid_1.buildUUID)();
        const videoChannelDisplayName = `Main ${user.username} channel`;
        return {
            name: channelName,
            displayName: videoChannelDisplayName
        };
    });
}
