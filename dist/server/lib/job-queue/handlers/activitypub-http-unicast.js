"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processActivityPubHttpUnicast = void 0;
const tslib_1 = require("tslib");
const logger_1 = require("../../../helpers/logger");
const requests_1 = require("../../../helpers/requests");
const files_cache_1 = require("../../files-cache");
const activitypub_http_utils_1 = require("./utils/activitypub-http-utils");
function processActivityPubHttpUnicast(job) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        logger_1.logger.info('Processing ActivityPub unicast in job %d.', job.id);
        const payload = job.data;
        const uri = payload.uri;
        const body = yield activitypub_http_utils_1.computeBody(payload);
        const httpSignatureOptions = yield activitypub_http_utils_1.buildSignedRequestOptions(payload);
        const options = {
            method: 'POST',
            json: body,
            httpSignature: httpSignatureOptions,
            headers: activitypub_http_utils_1.buildGlobalHeaders(body)
        };
        try {
            yield requests_1.doRequest(uri, options);
            files_cache_1.ActorFollowScoreCache.Instance.updateActorFollowsScore([uri], []);
        }
        catch (err) {
            files_cache_1.ActorFollowScoreCache.Instance.updateActorFollowsScore([], [uri]);
            throw err;
        }
    });
}
exports.processActivityPubHttpUnicast = processActivityPubHttpUnicast;
