"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userSubscriptionGetValidator = exports.userSubscriptionAddValidator = exports.userSubscriptionListValidator = exports.areSubscriptionsExistValidator = void 0;
const tslib_1 = require("tslib");
const express_validator_1 = require("express-validator");
const http_error_codes_1 = require("../../../shared/models/http/http-error-codes");
const actor_1 = require("../../helpers/custom-validators/activitypub/actor");
const misc_1 = require("../../helpers/custom-validators/misc");
const logger_1 = require("../../helpers/logger");
const constants_1 = require("../../initializers/constants");
const actor_follow_1 = require("../../models/actor/actor-follow");
const shared_1 = require("./shared");
const userSubscriptionListValidator = [
    express_validator_1.query('search').optional().not().isEmpty().withMessage('Should have a valid search'),
    (req, res, next) => {
        logger_1.logger.debug('Checking userSubscriptionListValidator parameters', { parameters: req.query });
        if (shared_1.areValidationErrors(req, res))
            return;
        return next();
    }
];
exports.userSubscriptionListValidator = userSubscriptionListValidator;
const userSubscriptionAddValidator = [
    express_validator_1.body('uri').custom(actor_1.isValidActorHandle).withMessage('Should have a valid URI to follow (username@domain)'),
    (req, res, next) => {
        logger_1.logger.debug('Checking userSubscriptionAddValidator parameters', { parameters: req.body });
        if (shared_1.areValidationErrors(req, res))
            return;
        return next();
    }
];
exports.userSubscriptionAddValidator = userSubscriptionAddValidator;
const areSubscriptionsExistValidator = [
    express_validator_1.query('uris')
        .customSanitizer(misc_1.toArray)
        .custom(actor_1.areValidActorHandles).withMessage('Should have a valid uri array'),
    (req, res, next) => {
        logger_1.logger.debug('Checking areSubscriptionsExistValidator parameters', { parameters: req.query });
        if (shared_1.areValidationErrors(req, res))
            return;
        return next();
    }
];
exports.areSubscriptionsExistValidator = areSubscriptionsExistValidator;
const userSubscriptionGetValidator = [
    express_validator_1.param('uri').custom(actor_1.isValidActorHandle).withMessage('Should have a valid URI to unfollow'),
    (req, res, next) => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
        logger_1.logger.debug('Checking userSubscriptionGetValidator parameters', { parameters: req.params });
        if (shared_1.areValidationErrors(req, res))
            return;
        let [name, host] = req.params.uri.split('@');
        if (host === constants_1.WEBSERVER.HOST)
            host = null;
        const user = res.locals.oauth.token.User;
        const subscription = yield actor_follow_1.ActorFollowModel.loadByActorAndTargetNameAndHostForAPI(user.Account.Actor.id, name, host);
        if (!subscription || !subscription.ActorFollowing.VideoChannel) {
            return res.fail({
                status: http_error_codes_1.HttpStatusCode.NOT_FOUND_404,
                message: `Subscription ${req.params.uri} not found.`
            });
        }
        res.locals.subscription = subscription;
        return next();
    })
];
exports.userSubscriptionGetValidator = userSubscriptionGetValidator;
