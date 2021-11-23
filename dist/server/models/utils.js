"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchAttribute = exports.createSafeIn = exports.buildDirectionAndField = exports.getFollowsSort = exports.parseAggregateResult = exports.isOutdated = exports.buildWhereIdOrUUID = exports.buildTrigramSearchIndex = exports.buildServerIdsFollowedBy = exports.throwIfNotValid = exports.createSimilarityAttribute = exports.getBlacklistSort = exports.getVideoSort = exports.getCommentSort = exports.getSort = exports.buildLocalAccountIdsIn = exports.getPlaylistSort = exports.buildLocalActorIdsIn = exports.buildBlockedAccountSQLOptimized = exports.buildBlockedAccountSQL = void 0;
const tslib_1 = require("tslib");
const sequelize_1 = require("sequelize");
const validator_1 = (0, tslib_1.__importDefault)(require("validator"));
function getSort(value, lastSort = ['id', 'ASC']) {
    const { direction, field } = buildDirectionAndField(value);
    let finalField;
    if (field.toLowerCase() === 'match') {
        finalField = sequelize_1.Sequelize.col('similarity');
    }
    else if (field === 'videoQuotaUsed') {
        finalField = sequelize_1.Sequelize.col('videoQuotaUsed');
    }
    else {
        finalField = field;
    }
    return [[finalField, direction], lastSort];
}
exports.getSort = getSort;
function getPlaylistSort(value, lastSort = ['id', 'ASC']) {
    const { direction, field } = buildDirectionAndField(value);
    if (field.toLowerCase() === 'name') {
        return [['displayName', direction], lastSort];
    }
    return getSort(value, lastSort);
}
exports.getPlaylistSort = getPlaylistSort;
function getCommentSort(value, lastSort = ['id', 'ASC']) {
    const { direction, field } = buildDirectionAndField(value);
    if (field === 'totalReplies') {
        return [
            [sequelize_1.Sequelize.literal('"totalReplies"'), direction],
            lastSort
        ];
    }
    return getSort(value, lastSort);
}
exports.getCommentSort = getCommentSort;
function getVideoSort(value, lastSort = ['id', 'ASC']) {
    const { direction, field } = buildDirectionAndField(value);
    if (field.toLowerCase() === 'trending') {
        return [
            [sequelize_1.Sequelize.fn('COALESCE', sequelize_1.Sequelize.fn('SUM', sequelize_1.Sequelize.col('VideoViews.views')), '0'), direction],
            [sequelize_1.Sequelize.col('VideoModel.views'), direction],
            lastSort
        ];
    }
    else if (field === 'publishedAt') {
        return [
            ['ScheduleVideoUpdate', 'updateAt', direction + ' NULLS LAST'],
            [sequelize_1.Sequelize.col('VideoModel.publishedAt'), direction],
            lastSort
        ];
    }
    let finalField;
    if (field.toLowerCase() === 'match') {
        finalField = sequelize_1.Sequelize.col('similarity');
    }
    else {
        finalField = field;
    }
    const firstSort = typeof finalField === 'string'
        ? finalField.split('.').concat([direction])
        : [finalField, direction];
    return [firstSort, lastSort];
}
exports.getVideoSort = getVideoSort;
function getBlacklistSort(model, value, lastSort = ['id', 'ASC']) {
    const [firstSort] = getSort(value);
    if (model)
        return [[(0, sequelize_1.literal)(`"${model}.${firstSort[0]}" ${firstSort[1]}`)], lastSort];
    return [firstSort, lastSort];
}
exports.getBlacklistSort = getBlacklistSort;
function getFollowsSort(value, lastSort = ['id', 'ASC']) {
    const { direction, field } = buildDirectionAndField(value);
    if (field === 'redundancyAllowed') {
        return [
            ['ActorFollowing', 'Server', 'redundancyAllowed', direction],
            lastSort
        ];
    }
    return getSort(value, lastSort);
}
exports.getFollowsSort = getFollowsSort;
function isOutdated(model, refreshInterval) {
    if (!model.createdAt || !model.updatedAt) {
        throw new Error('Miss createdAt & updatedAt attribuets to model');
    }
    const now = Date.now();
    const createdAtTime = model.createdAt.getTime();
    const updatedAtTime = model.updatedAt.getTime();
    return (now - createdAtTime) > refreshInterval && (now - updatedAtTime) > refreshInterval;
}
exports.isOutdated = isOutdated;
function throwIfNotValid(value, validator, fieldName = 'value', nullable = false) {
    if (nullable && (value === null || value === undefined))
        return;
    if (validator(value) === false) {
        throw new Error(`"${value}" is not a valid ${fieldName}.`);
    }
}
exports.throwIfNotValid = throwIfNotValid;
function buildTrigramSearchIndex(indexName, attribute) {
    return {
        name: indexName,
        fields: [sequelize_1.Sequelize.literal('lower(immutable_unaccent(' + attribute + ')) gin_trgm_ops')],
        using: 'gin',
        operator: 'gin_trgm_ops'
    };
}
exports.buildTrigramSearchIndex = buildTrigramSearchIndex;
function createSimilarityAttribute(col, value) {
    return sequelize_1.Sequelize.fn('similarity', searchTrigramNormalizeCol(col), searchTrigramNormalizeValue(value));
}
exports.createSimilarityAttribute = createSimilarityAttribute;
function buildBlockedAccountSQL(blockerIds) {
    const blockerIdsString = blockerIds.join(', ');
    return 'SELECT "targetAccountId" AS "id" FROM "accountBlocklist" WHERE "accountId" IN (' + blockerIdsString + ')' +
        ' UNION ' +
        'SELECT "account"."id" AS "id" FROM account INNER JOIN "actor" ON account."actorId" = actor.id ' +
        'INNER JOIN "serverBlocklist" ON "actor"."serverId" = "serverBlocklist"."targetServerId" ' +
        'WHERE "serverBlocklist"."accountId" IN (' + blockerIdsString + ')';
}
exports.buildBlockedAccountSQL = buildBlockedAccountSQL;
function buildBlockedAccountSQLOptimized(columnNameJoin, blockerIds) {
    const blockerIdsString = blockerIds.join(', ');
    return [
        (0, sequelize_1.literal)(`NOT EXISTS (` +
            `  SELECT 1 FROM "accountBlocklist" ` +
            `  WHERE "targetAccountId" = ${columnNameJoin} ` +
            `  AND "accountId" IN (${blockerIdsString})` +
            `)`),
        (0, sequelize_1.literal)(`NOT EXISTS (` +
            `  SELECT 1 FROM "account" ` +
            `  INNER JOIN "actor" ON account."actorId" = actor.id ` +
            `  INNER JOIN "serverBlocklist" ON "actor"."serverId" = "serverBlocklist"."targetServerId" ` +
            `  WHERE "account"."id" = ${columnNameJoin} ` +
            `  AND "serverBlocklist"."accountId" IN (${blockerIdsString})` +
            `)`)
    ];
}
exports.buildBlockedAccountSQLOptimized = buildBlockedAccountSQLOptimized;
function buildServerIdsFollowedBy(actorId) {
    const actorIdNumber = parseInt(actorId + '', 10);
    return '(' +
        'SELECT "actor"."serverId" FROM "actorFollow" ' +
        'INNER JOIN "actor" ON actor.id = "actorFollow"."targetActorId" ' +
        'WHERE "actorFollow"."actorId" = ' + actorIdNumber +
        ')';
}
exports.buildServerIdsFollowedBy = buildServerIdsFollowedBy;
function buildWhereIdOrUUID(id) {
    return validator_1.default.isInt('' + id) ? { id } : { uuid: id };
}
exports.buildWhereIdOrUUID = buildWhereIdOrUUID;
function parseAggregateResult(result) {
    if (!result)
        return 0;
    const total = parseInt(result + '', 10);
    if (isNaN(total))
        return 0;
    return total;
}
exports.parseAggregateResult = parseAggregateResult;
function createSafeIn(sequelize, stringArr) {
    return stringArr.map(t => {
        return t === null
            ? null
            : sequelize.escape('' + t);
    }).join(', ');
}
exports.createSafeIn = createSafeIn;
function buildLocalAccountIdsIn() {
    return (0, sequelize_1.literal)('(SELECT "account"."id" FROM "account" INNER JOIN "actor" ON "actor"."id" = "account"."actorId" AND "actor"."serverId" IS NULL)');
}
exports.buildLocalAccountIdsIn = buildLocalAccountIdsIn;
function buildLocalActorIdsIn() {
    return (0, sequelize_1.literal)('(SELECT "actor"."id" FROM "actor" WHERE "actor"."serverId" IS NULL)');
}
exports.buildLocalActorIdsIn = buildLocalActorIdsIn;
function buildDirectionAndField(value) {
    let field;
    let direction;
    if (value.substring(0, 1) === '-') {
        direction = 'DESC';
        field = value.substring(1);
    }
    else {
        direction = 'ASC';
        field = value;
    }
    return { direction, field };
}
exports.buildDirectionAndField = buildDirectionAndField;
function searchAttribute(sourceField, targetField) {
    if (!sourceField)
        return {};
    return {
        [targetField]: {
            [sequelize_1.Op.iLike]: `%${sourceField}%`
        }
    };
}
exports.searchAttribute = searchAttribute;
function searchTrigramNormalizeValue(value) {
    return sequelize_1.Sequelize.fn('lower', sequelize_1.Sequelize.fn('immutable_unaccent', value));
}
function searchTrigramNormalizeCol(col) {
    return sequelize_1.Sequelize.fn('lower', sequelize_1.Sequelize.fn('immutable_unaccent', sequelize_1.Sequelize.col(col)));
}
