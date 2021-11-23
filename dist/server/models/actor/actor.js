"use strict";
var ActorModel_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActorModel = exports.unusedActorAttributesForAPI = void 0;
const tslib_1 = require("tslib");
const lodash_1 = require("lodash");
const sequelize_1 = require("sequelize");
const sequelize_typescript_1 = require("sequelize-typescript");
const core_utils_1 = require("@server/helpers/core-utils");
const model_cache_1 = require("@server/models/model-cache");
const activitypub_1 = require("../../helpers/activitypub");
const actor_1 = require("../../helpers/custom-validators/activitypub/actor");
const misc_1 = require("../../helpers/custom-validators/activitypub/misc");
const constants_1 = require("../../initializers/constants");
const account_1 = require("../account/account");
const server_1 = require("../server/server");
const utils_1 = require("../utils");
const video_1 = require("../video/video");
const video_channel_1 = require("../video/video-channel");
const actor_follow_1 = require("./actor-follow");
const actor_image_1 = require("./actor-image");
var ScopeNames;
(function (ScopeNames) {
    ScopeNames["FULL"] = "FULL";
})(ScopeNames || (ScopeNames = {}));
exports.unusedActorAttributesForAPI = [
    'publicKey',
    'privateKey',
    'inboxUrl',
    'outboxUrl',
    'sharedInboxUrl',
    'followersUrl',
    'followingUrl'
];
let ActorModel = ActorModel_1 = class ActorModel extends sequelize_typescript_1.Model {
    static load(id) {
        return ActorModel_1.unscoped().findByPk(id);
    }
    static loadFull(id) {
        return ActorModel_1.scope(ScopeNames.FULL).findByPk(id);
    }
    static loadFromAccountByVideoId(videoId, transaction) {
        const query = {
            include: [
                {
                    attributes: ['id'],
                    model: account_1.AccountModel.unscoped(),
                    required: true,
                    include: [
                        {
                            attributes: ['id'],
                            model: video_channel_1.VideoChannelModel.unscoped(),
                            required: true,
                            include: [
                                {
                                    attributes: ['id'],
                                    model: video_1.VideoModel.unscoped(),
                                    required: true,
                                    where: {
                                        id: videoId
                                    }
                                }
                            ]
                        }
                    ]
                }
            ],
            transaction
        };
        return ActorModel_1.unscoped().findOne(query);
    }
    static isActorUrlExist(url) {
        const query = {
            raw: true,
            where: {
                url
            }
        };
        return ActorModel_1.unscoped().findOne(query)
            .then(a => !!a);
    }
    static listByFollowersUrls(followersUrls, transaction) {
        const query = {
            where: {
                followersUrl: {
                    [sequelize_1.Op.in]: followersUrls
                }
            },
            transaction
        };
        return ActorModel_1.scope(ScopeNames.FULL).findAll(query);
    }
    static loadLocalByName(preferredUsername, transaction) {
        const fun = () => {
            const query = {
                where: {
                    preferredUsername,
                    serverId: null
                },
                transaction
            };
            return ActorModel_1.scope(ScopeNames.FULL)
                .findOne(query);
        };
        return model_cache_1.ModelCache.Instance.doCache({
            cacheType: 'local-actor-name',
            key: preferredUsername,
            whitelist: () => preferredUsername === constants_1.SERVER_ACTOR_NAME,
            fun
        });
    }
    static loadLocalUrlByName(preferredUsername, transaction) {
        const fun = () => {
            const query = {
                attributes: ['url'],
                where: {
                    preferredUsername,
                    serverId: null
                },
                transaction
            };
            return ActorModel_1.unscoped()
                .findOne(query);
        };
        return model_cache_1.ModelCache.Instance.doCache({
            cacheType: 'local-actor-name',
            key: preferredUsername,
            whitelist: () => preferredUsername === constants_1.SERVER_ACTOR_NAME,
            fun
        });
    }
    static loadByNameAndHost(preferredUsername, host) {
        const query = {
            where: {
                preferredUsername
            },
            include: [
                {
                    model: server_1.ServerModel,
                    required: true,
                    where: {
                        host
                    }
                }
            ]
        };
        return ActorModel_1.scope(ScopeNames.FULL).findOne(query);
    }
    static loadByUrl(url, transaction) {
        const query = {
            where: {
                url
            },
            transaction,
            include: [
                {
                    attributes: ['id'],
                    model: account_1.AccountModel.unscoped(),
                    required: false
                },
                {
                    attributes: ['id'],
                    model: video_channel_1.VideoChannelModel.unscoped(),
                    required: false
                }
            ]
        };
        return ActorModel_1.unscoped().findOne(query);
    }
    static loadByUrlAndPopulateAccountAndChannel(url, transaction) {
        const query = {
            where: {
                url
            },
            transaction
        };
        return ActorModel_1.scope(ScopeNames.FULL).findOne(query);
    }
    static rebuildFollowsCount(ofId, type, transaction) {
        const sanitizedOfId = parseInt(ofId + '', 10);
        const where = { id: sanitizedOfId };
        let columnToUpdate;
        let columnOfCount;
        if (type === 'followers') {
            columnToUpdate = 'followersCount';
            columnOfCount = 'targetActorId';
        }
        else {
            columnToUpdate = 'followingCount';
            columnOfCount = 'actorId';
        }
        return ActorModel_1.update({
            [columnToUpdate]: (0, sequelize_1.literal)(`(SELECT COUNT(*) FROM "actorFollow" WHERE "${columnOfCount}" = ${sanitizedOfId})`)
        }, { where, transaction });
    }
    static loadAccountActorByVideoId(videoId, transaction) {
        const query = {
            include: [
                {
                    attributes: ['id'],
                    model: account_1.AccountModel.unscoped(),
                    required: true,
                    include: [
                        {
                            attributes: ['id', 'accountId'],
                            model: video_channel_1.VideoChannelModel.unscoped(),
                            required: true,
                            include: [
                                {
                                    attributes: ['id', 'channelId'],
                                    model: video_1.VideoModel.unscoped(),
                                    where: {
                                        id: videoId
                                    }
                                }
                            ]
                        }
                    ]
                }
            ],
            transaction
        };
        return ActorModel_1.unscoped().findOne(query);
    }
    getSharedInbox() {
        return this.sharedInboxUrl || this.inboxUrl;
    }
    toFormattedSummaryJSON() {
        let avatar = null;
        if (this.Avatar) {
            avatar = this.Avatar.toFormattedJSON();
        }
        return {
            url: this.url,
            name: this.preferredUsername,
            host: this.getHost(),
            avatar
        };
    }
    toFormattedJSON() {
        const base = this.toFormattedSummaryJSON();
        let banner = null;
        if (this.Banner) {
            banner = this.Banner.toFormattedJSON();
        }
        return Object.assign(base, {
            id: this.id,
            hostRedundancyAllowed: this.getRedundancyAllowed(),
            followingCount: this.followingCount,
            followersCount: this.followersCount,
            banner,
            createdAt: this.getCreatedAt()
        });
    }
    toActivityPubObject(name) {
        let icon;
        let image;
        if (this.avatarId) {
            const extension = (0, core_utils_1.getLowercaseExtension)(this.Avatar.filename);
            icon = {
                type: 'Image',
                mediaType: constants_1.MIMETYPES.IMAGE.EXT_MIMETYPE[extension],
                height: this.Avatar.height,
                width: this.Avatar.width,
                url: this.getAvatarUrl()
            };
        }
        if (this.bannerId) {
            const banner = this.Banner;
            const extension = (0, core_utils_1.getLowercaseExtension)(banner.filename);
            image = {
                type: 'Image',
                mediaType: constants_1.MIMETYPES.IMAGE.EXT_MIMETYPE[extension],
                height: banner.height,
                width: banner.width,
                url: this.getBannerUrl()
            };
        }
        const json = {
            type: this.type,
            id: this.url,
            following: this.getFollowingUrl(),
            followers: this.getFollowersUrl(),
            playlists: this.getPlaylistsUrl(),
            inbox: this.inboxUrl,
            outbox: this.outboxUrl,
            preferredUsername: this.preferredUsername,
            url: this.url,
            name,
            endpoints: {
                sharedInbox: this.sharedInboxUrl
            },
            publicKey: {
                id: this.getPublicKeyUrl(),
                owner: this.url,
                publicKeyPem: this.publicKey
            },
            published: this.getCreatedAt().toISOString(),
            icon,
            image
        };
        return (0, activitypub_1.activityPubContextify)(json);
    }
    getFollowerSharedInboxUrls(t) {
        const query = {
            attributes: ['sharedInboxUrl'],
            include: [
                {
                    attribute: [],
                    model: actor_follow_1.ActorFollowModel.unscoped(),
                    required: true,
                    as: 'ActorFollowing',
                    where: {
                        state: 'accepted',
                        targetActorId: this.id
                    }
                }
            ],
            transaction: t
        };
        return ActorModel_1.findAll(query)
            .then(accounts => accounts.map(a => a.sharedInboxUrl));
    }
    getFollowingUrl() {
        return this.url + '/following';
    }
    getFollowersUrl() {
        return this.url + '/followers';
    }
    getPlaylistsUrl() {
        return this.url + '/playlists';
    }
    getPublicKeyUrl() {
        return this.url + '#main-key';
    }
    isOwned() {
        return this.serverId === null;
    }
    getWebfingerUrl() {
        return 'acct:' + this.preferredUsername + '@' + this.getHost();
    }
    getIdentifier() {
        return this.Server ? `${this.preferredUsername}@${this.Server.host}` : this.preferredUsername;
    }
    getHost() {
        return this.Server ? this.Server.host : constants_1.WEBSERVER.HOST;
    }
    getRedundancyAllowed() {
        return this.Server ? this.Server.redundancyAllowed : false;
    }
    getAvatarUrl() {
        if (!this.avatarId)
            return undefined;
        return constants_1.WEBSERVER.URL + this.Avatar.getStaticPath();
    }
    getBannerUrl() {
        if (!this.bannerId)
            return undefined;
        return constants_1.WEBSERVER.URL + this.Banner.getStaticPath();
    }
    isOutdated() {
        if (this.isOwned())
            return false;
        return (0, utils_1.isOutdated)(this, constants_1.ACTIVITY_PUB.ACTOR_REFRESH_INTERVAL);
    }
    getCreatedAt() {
        return this.remoteCreatedAt || this.createdAt;
    }
};
(0, tslib_1.__decorate)([
    (0, sequelize_typescript_1.AllowNull)(false),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.ENUM(...(0, lodash_1.values)(constants_1.ACTIVITY_PUB_ACTOR_TYPES))),
    (0, tslib_1.__metadata)("design:type", String)
], ActorModel.prototype, "type", void 0);
(0, tslib_1.__decorate)([
    (0, sequelize_typescript_1.AllowNull)(false),
    (0, sequelize_typescript_1.Is)('ActorPreferredUsername', value => (0, utils_1.throwIfNotValid)(value, actor_1.isActorPreferredUsernameValid, 'actor preferred username')),
    sequelize_typescript_1.Column,
    (0, tslib_1.__metadata)("design:type", String)
], ActorModel.prototype, "preferredUsername", void 0);
(0, tslib_1.__decorate)([
    (0, sequelize_typescript_1.AllowNull)(false),
    (0, sequelize_typescript_1.Is)('ActorUrl', value => (0, utils_1.throwIfNotValid)(value, misc_1.isActivityPubUrlValid, 'url')),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.STRING(constants_1.CONSTRAINTS_FIELDS.ACTORS.URL.max)),
    (0, tslib_1.__metadata)("design:type", String)
], ActorModel.prototype, "url", void 0);
(0, tslib_1.__decorate)([
    (0, sequelize_typescript_1.AllowNull)(true),
    (0, sequelize_typescript_1.Is)('ActorPublicKey', value => (0, utils_1.throwIfNotValid)(value, actor_1.isActorPublicKeyValid, 'public key', true)),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.STRING(constants_1.CONSTRAINTS_FIELDS.ACTORS.PUBLIC_KEY.max)),
    (0, tslib_1.__metadata)("design:type", String)
], ActorModel.prototype, "publicKey", void 0);
(0, tslib_1.__decorate)([
    (0, sequelize_typescript_1.AllowNull)(true),
    (0, sequelize_typescript_1.Is)('ActorPublicKey', value => (0, utils_1.throwIfNotValid)(value, actor_1.isActorPrivateKeyValid, 'private key', true)),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.STRING(constants_1.CONSTRAINTS_FIELDS.ACTORS.PRIVATE_KEY.max)),
    (0, tslib_1.__metadata)("design:type", String)
], ActorModel.prototype, "privateKey", void 0);
(0, tslib_1.__decorate)([
    (0, sequelize_typescript_1.AllowNull)(false),
    (0, sequelize_typescript_1.Is)('ActorFollowersCount', value => (0, utils_1.throwIfNotValid)(value, actor_1.isActorFollowersCountValid, 'followers count')),
    sequelize_typescript_1.Column,
    (0, tslib_1.__metadata)("design:type", Number)
], ActorModel.prototype, "followersCount", void 0);
(0, tslib_1.__decorate)([
    (0, sequelize_typescript_1.AllowNull)(false),
    (0, sequelize_typescript_1.Is)('ActorFollowersCount', value => (0, utils_1.throwIfNotValid)(value, actor_1.isActorFollowingCountValid, 'following count')),
    sequelize_typescript_1.Column,
    (0, tslib_1.__metadata)("design:type", Number)
], ActorModel.prototype, "followingCount", void 0);
(0, tslib_1.__decorate)([
    (0, sequelize_typescript_1.AllowNull)(false),
    (0, sequelize_typescript_1.Is)('ActorInboxUrl', value => (0, utils_1.throwIfNotValid)(value, misc_1.isActivityPubUrlValid, 'inbox url')),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.STRING(constants_1.CONSTRAINTS_FIELDS.ACTORS.URL.max)),
    (0, tslib_1.__metadata)("design:type", String)
], ActorModel.prototype, "inboxUrl", void 0);
(0, tslib_1.__decorate)([
    (0, sequelize_typescript_1.AllowNull)(true),
    (0, sequelize_typescript_1.Is)('ActorOutboxUrl', value => (0, utils_1.throwIfNotValid)(value, misc_1.isActivityPubUrlValid, 'outbox url', true)),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.STRING(constants_1.CONSTRAINTS_FIELDS.ACTORS.URL.max)),
    (0, tslib_1.__metadata)("design:type", String)
], ActorModel.prototype, "outboxUrl", void 0);
(0, tslib_1.__decorate)([
    (0, sequelize_typescript_1.AllowNull)(true),
    (0, sequelize_typescript_1.Is)('ActorSharedInboxUrl', value => (0, utils_1.throwIfNotValid)(value, misc_1.isActivityPubUrlValid, 'shared inbox url', true)),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.STRING(constants_1.CONSTRAINTS_FIELDS.ACTORS.URL.max)),
    (0, tslib_1.__metadata)("design:type", String)
], ActorModel.prototype, "sharedInboxUrl", void 0);
(0, tslib_1.__decorate)([
    (0, sequelize_typescript_1.AllowNull)(true),
    (0, sequelize_typescript_1.Is)('ActorFollowersUrl', value => (0, utils_1.throwIfNotValid)(value, misc_1.isActivityPubUrlValid, 'followers url', true)),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.STRING(constants_1.CONSTRAINTS_FIELDS.ACTORS.URL.max)),
    (0, tslib_1.__metadata)("design:type", String)
], ActorModel.prototype, "followersUrl", void 0);
(0, tslib_1.__decorate)([
    (0, sequelize_typescript_1.AllowNull)(true),
    (0, sequelize_typescript_1.Is)('ActorFollowingUrl', value => (0, utils_1.throwIfNotValid)(value, misc_1.isActivityPubUrlValid, 'following url', true)),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.STRING(constants_1.CONSTRAINTS_FIELDS.ACTORS.URL.max)),
    (0, tslib_1.__metadata)("design:type", String)
], ActorModel.prototype, "followingUrl", void 0);
(0, tslib_1.__decorate)([
    (0, sequelize_typescript_1.AllowNull)(true),
    sequelize_typescript_1.Column,
    (0, tslib_1.__metadata)("design:type", Date)
], ActorModel.prototype, "remoteCreatedAt", void 0);
(0, tslib_1.__decorate)([
    sequelize_typescript_1.CreatedAt,
    (0, tslib_1.__metadata)("design:type", Date)
], ActorModel.prototype, "createdAt", void 0);
(0, tslib_1.__decorate)([
    sequelize_typescript_1.UpdatedAt,
    (0, tslib_1.__metadata)("design:type", Date)
], ActorModel.prototype, "updatedAt", void 0);
(0, tslib_1.__decorate)([
    (0, sequelize_typescript_1.ForeignKey)(() => actor_image_1.ActorImageModel),
    sequelize_typescript_1.Column,
    (0, tslib_1.__metadata)("design:type", Number)
], ActorModel.prototype, "avatarId", void 0);
(0, tslib_1.__decorate)([
    (0, sequelize_typescript_1.ForeignKey)(() => actor_image_1.ActorImageModel),
    sequelize_typescript_1.Column,
    (0, tslib_1.__metadata)("design:type", Number)
], ActorModel.prototype, "bannerId", void 0);
(0, tslib_1.__decorate)([
    (0, sequelize_typescript_1.BelongsTo)(() => actor_image_1.ActorImageModel, {
        foreignKey: {
            name: 'avatarId',
            allowNull: true
        },
        as: 'Avatar',
        onDelete: 'set null',
        hooks: true
    }),
    (0, tslib_1.__metadata)("design:type", actor_image_1.ActorImageModel)
], ActorModel.prototype, "Avatar", void 0);
(0, tslib_1.__decorate)([
    (0, sequelize_typescript_1.BelongsTo)(() => actor_image_1.ActorImageModel, {
        foreignKey: {
            name: 'bannerId',
            allowNull: true
        },
        as: 'Banner',
        onDelete: 'set null',
        hooks: true
    }),
    (0, tslib_1.__metadata)("design:type", actor_image_1.ActorImageModel)
], ActorModel.prototype, "Banner", void 0);
(0, tslib_1.__decorate)([
    (0, sequelize_typescript_1.HasMany)(() => actor_follow_1.ActorFollowModel, {
        foreignKey: {
            name: 'actorId',
            allowNull: false
        },
        as: 'ActorFollowings',
        onDelete: 'cascade'
    }),
    (0, tslib_1.__metadata)("design:type", Array)
], ActorModel.prototype, "ActorFollowing", void 0);
(0, tslib_1.__decorate)([
    (0, sequelize_typescript_1.HasMany)(() => actor_follow_1.ActorFollowModel, {
        foreignKey: {
            name: 'targetActorId',
            allowNull: false
        },
        as: 'ActorFollowers',
        onDelete: 'cascade'
    }),
    (0, tslib_1.__metadata)("design:type", Array)
], ActorModel.prototype, "ActorFollowers", void 0);
(0, tslib_1.__decorate)([
    (0, sequelize_typescript_1.ForeignKey)(() => server_1.ServerModel),
    sequelize_typescript_1.Column,
    (0, tslib_1.__metadata)("design:type", Number)
], ActorModel.prototype, "serverId", void 0);
(0, tslib_1.__decorate)([
    (0, sequelize_typescript_1.BelongsTo)(() => server_1.ServerModel, {
        foreignKey: {
            allowNull: true
        },
        onDelete: 'cascade'
    }),
    (0, tslib_1.__metadata)("design:type", server_1.ServerModel)
], ActorModel.prototype, "Server", void 0);
(0, tslib_1.__decorate)([
    (0, sequelize_typescript_1.HasOne)(() => account_1.AccountModel, {
        foreignKey: {
            allowNull: true
        },
        onDelete: 'cascade',
        hooks: true
    }),
    (0, tslib_1.__metadata)("design:type", account_1.AccountModel)
], ActorModel.prototype, "Account", void 0);
(0, tslib_1.__decorate)([
    (0, sequelize_typescript_1.HasOne)(() => video_channel_1.VideoChannelModel, {
        foreignKey: {
            allowNull: true
        },
        onDelete: 'cascade',
        hooks: true
    }),
    (0, tslib_1.__metadata)("design:type", video_channel_1.VideoChannelModel)
], ActorModel.prototype, "VideoChannel", void 0);
ActorModel = ActorModel_1 = (0, tslib_1.__decorate)([
    (0, sequelize_typescript_1.DefaultScope)(() => ({
        include: [
            {
                model: server_1.ServerModel,
                required: false
            },
            {
                model: actor_image_1.ActorImageModel,
                as: 'Avatar',
                required: false
            }
        ]
    })),
    (0, sequelize_typescript_1.Scopes)(() => ({
        [ScopeNames.FULL]: {
            include: [
                {
                    model: account_1.AccountModel.unscoped(),
                    required: false
                },
                {
                    model: video_channel_1.VideoChannelModel.unscoped(),
                    required: false,
                    include: [
                        {
                            model: account_1.AccountModel,
                            required: true
                        }
                    ]
                },
                {
                    model: server_1.ServerModel,
                    required: false
                },
                {
                    model: actor_image_1.ActorImageModel,
                    as: 'Avatar',
                    required: false
                },
                {
                    model: actor_image_1.ActorImageModel,
                    as: 'Banner',
                    required: false
                }
            ]
        }
    })),
    (0, sequelize_typescript_1.Table)({
        tableName: 'actor',
        indexes: [
            {
                fields: ['url'],
                unique: true
            },
            {
                fields: ['preferredUsername', 'serverId'],
                unique: true,
                where: {
                    serverId: {
                        [sequelize_1.Op.ne]: null
                    }
                }
            },
            {
                fields: ['preferredUsername'],
                unique: true,
                where: {
                    serverId: null
                }
            },
            {
                fields: ['inboxUrl', 'sharedInboxUrl']
            },
            {
                fields: ['sharedInboxUrl']
            },
            {
                fields: ['serverId']
            },
            {
                fields: ['avatarId']
            },
            {
                fields: ['followersUrl']
            }
        ]
    })
], ActorModel);
exports.ActorModel = ActorModel;
