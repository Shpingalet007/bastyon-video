"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBypassFromPasswordGrant = exports.getAuthNameFromRefreshGrant = exports.getBypassFromExternalAuth = exports.onExternalUserAuthenticated = void 0;
const tslib_1 = require("tslib");
const users_1 = require("@server/helpers/custom-validators/users");
const logger_1 = require("@server/helpers/logger");
const utils_1 = require("@server/helpers/utils");
const constants_1 = require("@server/initializers/constants");
const plugin_manager_1 = require("@server/lib/plugins/plugin-manager");
const oauth_token_1 = require("@server/models/oauth/oauth-token");
const models_1 = require("@shared/models");
const authBypassTokens = new Map();
function onExternalUserAuthenticated(options) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const { npmName, authName, authResult } = options;
        if (!authResult.req || !authResult.res) {
            logger_1.logger.error('Cannot authenticate external user for auth %s of plugin %s: no req or res are provided.', authName, npmName);
            return;
        }
        const { res } = authResult;
        if (!isAuthResultValid(npmName, authName, authResult)) {
            res.redirect('/login?externalAuthError=true');
            return;
        }
        logger_1.logger.info('Generating auth bypass token for %s in auth %s of plugin %s.', authResult.username, authName, npmName);
        const bypassToken = yield utils_1.generateRandomString(32);
        const expires = new Date();
        expires.setTime(expires.getTime() + constants_1.PLUGIN_EXTERNAL_AUTH_TOKEN_LIFETIME);
        const user = buildUserResult(authResult);
        authBypassTokens.set(bypassToken, {
            expires,
            user,
            npmName,
            authName
        });
        const now = new Date();
        for (const [key, value] of authBypassTokens) {
            if (value.expires.getTime() < now.getTime()) {
                authBypassTokens.delete(key);
            }
        }
        res.redirect(`/login?externalAuthToken=${bypassToken}&username=${user.username}`);
    });
}
exports.onExternalUserAuthenticated = onExternalUserAuthenticated;
function getAuthNameFromRefreshGrant(refreshToken) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        if (!refreshToken)
            return undefined;
        const tokenModel = yield oauth_token_1.OAuthTokenModel.loadByRefreshToken(refreshToken);
        return tokenModel === null || tokenModel === void 0 ? void 0 : tokenModel.authName;
    });
}
exports.getAuthNameFromRefreshGrant = getAuthNameFromRefreshGrant;
function getBypassFromPasswordGrant(username, password) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const plugins = plugin_manager_1.PluginManager.Instance.getIdAndPassAuths();
        const pluginAuths = [];
        for (const plugin of plugins) {
            const auths = plugin.idAndPassAuths;
            for (const auth of auths) {
                pluginAuths.push({
                    npmName: plugin.npmName,
                    registerAuthOptions: auth
                });
            }
        }
        pluginAuths.sort((a, b) => {
            const aWeight = a.registerAuthOptions.getWeight();
            const bWeight = b.registerAuthOptions.getWeight();
            if (aWeight === bWeight)
                return 0;
            if (aWeight < bWeight)
                return 1;
            return -1;
        });
        const loginOptions = {
            id: username,
            password
        };
        for (const pluginAuth of pluginAuths) {
            const authOptions = pluginAuth.registerAuthOptions;
            const authName = authOptions.authName;
            const npmName = pluginAuth.npmName;
            logger_1.logger.debug('Using auth method %s of plugin %s to login %s with weight %d.', authName, npmName, loginOptions.id, authOptions.getWeight());
            try {
                const loginResult = yield authOptions.login(loginOptions);
                if (!loginResult)
                    continue;
                if (!isAuthResultValid(pluginAuth.npmName, authOptions.authName, loginResult))
                    continue;
                logger_1.logger.info('Login success with auth method %s of plugin %s for %s.', authName, npmName, loginOptions.id);
                return {
                    bypass: true,
                    pluginName: pluginAuth.npmName,
                    authName: authOptions.authName,
                    user: buildUserResult(loginResult)
                };
            }
            catch (err) {
                logger_1.logger.error('Error in auth method %s of plugin %s', authOptions.authName, pluginAuth.npmName, { err });
            }
        }
        return undefined;
    });
}
exports.getBypassFromPasswordGrant = getBypassFromPasswordGrant;
function getBypassFromExternalAuth(username, externalAuthToken) {
    const obj = authBypassTokens.get(externalAuthToken);
    if (!obj)
        throw new Error('Cannot authenticate user with unknown bypass token');
    const { expires, user, authName, npmName } = obj;
    const now = new Date();
    if (now.getTime() > expires.getTime()) {
        throw new Error('Cannot authenticate user with an expired external auth token');
    }
    if (user.username !== username) {
        throw new Error(`Cannot authenticate user ${user.username} with invalid username ${username}`);
    }
    logger_1.logger.info('Auth success with external auth method %s of plugin %s for %s.', authName, npmName, user.email);
    return {
        bypass: true,
        pluginName: npmName,
        authName: authName,
        user
    };
}
exports.getBypassFromExternalAuth = getBypassFromExternalAuth;
function isAuthResultValid(npmName, authName, result) {
    if (!users_1.isUserUsernameValid(result.username)) {
        logger_1.logger.error('Auth method %s of plugin %s did not provide a valid username.', authName, npmName, { username: result.username });
        return false;
    }
    if (!result.email) {
        logger_1.logger.error('Auth method %s of plugin %s did not provide a valid email.', authName, npmName, { email: result.email });
        return false;
    }
    if (result.role && !users_1.isUserRoleValid(result.role)) {
        logger_1.logger.error('Auth method %s of plugin %s did not provide a valid role.', authName, npmName, { role: result.role });
        return false;
    }
    if (result.displayName && !users_1.isUserDisplayNameValid(result.displayName)) {
        logger_1.logger.error('Auth method %s of plugin %s did not provide a valid display name.', authName, npmName, { displayName: result.displayName });
        return false;
    }
    return true;
}
function buildUserResult(pluginResult) {
    var _a;
    return {
        username: pluginResult.username,
        email: pluginResult.email,
        role: (_a = pluginResult.role) !== null && _a !== void 0 ? _a : models_1.UserRole.USER,
        displayName: pluginResult.displayName || pluginResult.username,
        userQuota: pluginResult.userQuota
    };
}
