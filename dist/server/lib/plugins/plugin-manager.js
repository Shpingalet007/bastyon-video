"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PluginManager = void 0;
const tslib_1 = require("tslib");
const decache_1 = (0, tslib_1.__importDefault)(require("decache"));
const fs_1 = require("fs");
const fs_extra_1 = require("fs-extra");
const path_1 = require("path");
const core_utils_1 = require("@shared/core-utils");
const hooks_1 = require("../../../shared/core-utils/plugins/hooks");
const plugin_type_1 = require("../../../shared/models/plugins/plugin.type");
const plugins_1 = require("../../helpers/custom-validators/plugins");
const logger_1 = require("../../helpers/logger");
const config_1 = require("../../initializers/config");
const constants_1 = require("../../initializers/constants");
const plugin_1 = require("../../models/server/plugin");
const client_html_1 = require("../client-html");
const register_helpers_1 = require("./register-helpers");
const yarn_1 = require("./yarn");
class PluginManager {
    constructor() {
        this.registeredPlugins = {};
        this.hooks = {};
        this.translations = {};
    }
    isRegistered(npmName) {
        return !!this.getRegisteredPluginOrTheme(npmName);
    }
    getRegisteredPluginOrTheme(npmName) {
        return this.registeredPlugins[npmName];
    }
    getRegisteredPluginByShortName(name) {
        const npmName = plugin_1.PluginModel.buildNpmName(name, plugin_type_1.PluginType.PLUGIN);
        const registered = this.getRegisteredPluginOrTheme(npmName);
        if (!registered || registered.type !== plugin_type_1.PluginType.PLUGIN)
            return undefined;
        return registered;
    }
    getRegisteredThemeByShortName(name) {
        const npmName = plugin_1.PluginModel.buildNpmName(name, plugin_type_1.PluginType.THEME);
        const registered = this.getRegisteredPluginOrTheme(npmName);
        if (!registered || registered.type !== plugin_type_1.PluginType.THEME)
            return undefined;
        return registered;
    }
    getRegisteredPlugins() {
        return this.getRegisteredPluginsOrThemes(plugin_type_1.PluginType.PLUGIN);
    }
    getRegisteredThemes() {
        return this.getRegisteredPluginsOrThemes(plugin_type_1.PluginType.THEME);
    }
    getIdAndPassAuths() {
        return this.getRegisteredPlugins()
            .map(p => ({
            npmName: p.npmName,
            name: p.name,
            version: p.version,
            idAndPassAuths: p.registerHelpers.getIdAndPassAuths()
        }))
            .filter(v => v.idAndPassAuths.length !== 0);
    }
    getExternalAuths() {
        return this.getRegisteredPlugins()
            .map(p => ({
            npmName: p.npmName,
            name: p.name,
            version: p.version,
            externalAuths: p.registerHelpers.getExternalAuths()
        }))
            .filter(v => v.externalAuths.length !== 0);
    }
    getRegisteredSettings(npmName) {
        const result = this.getRegisteredPluginOrTheme(npmName);
        if (!result || result.type !== plugin_type_1.PluginType.PLUGIN)
            return [];
        return result.registerHelpers.getSettings();
    }
    getRouter(npmName) {
        const result = this.getRegisteredPluginOrTheme(npmName);
        if (!result || result.type !== plugin_type_1.PluginType.PLUGIN)
            return null;
        return result.registerHelpers.getRouter();
    }
    getTranslations(locale) {
        return this.translations[locale] || {};
    }
    isTokenValid(token, type) {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            const auth = this.getAuth(token.User.pluginAuth, token.authName);
            if (!auth)
                return true;
            if (auth.hookTokenValidity) {
                try {
                    const { valid } = yield auth.hookTokenValidity({ token, type });
                    if (valid === false) {
                        logger_1.logger.info('Rejecting %s token validity from auth %s of plugin %s', type, token.authName, token.User.pluginAuth);
                    }
                    return valid;
                }
                catch (err) {
                    logger_1.logger.warn('Cannot run check token validity from auth %s of plugin %s.', token.authName, token.User.pluginAuth, { err });
                    return true;
                }
            }
            return true;
        });
    }
    onLogout(npmName, authName, user, req) {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            const auth = this.getAuth(npmName, authName);
            if (auth === null || auth === void 0 ? void 0 : auth.onLogout) {
                logger_1.logger.info('Running onLogout function from auth %s of plugin %s', authName, npmName);
                try {
                    const result = yield auth.onLogout(user, req);
                    return typeof result === 'string'
                        ? result
                        : undefined;
                }
                catch (err) {
                    logger_1.logger.warn('Cannot run onLogout function from auth %s of plugin %s.', authName, npmName, { err });
                }
            }
            return undefined;
        });
    }
    onSettingsChanged(name, settings) {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            const registered = this.getRegisteredPluginByShortName(name);
            if (!registered) {
                logger_1.logger.error('Cannot find plugin %s to call on settings changed.', name);
            }
            for (const cb of registered.registerHelpers.getOnSettingsChangedCallbacks()) {
                try {
                    yield cb(settings);
                }
                catch (err) {
                    logger_1.logger.error('Cannot run on settings changed callback for %s.', registered.npmName, { err });
                }
            }
        });
    }
    runHook(hookName, result, params) {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            if (!this.hooks[hookName])
                return Promise.resolve(result);
            const hookType = (0, hooks_1.getHookType)(hookName);
            for (const hook of this.hooks[hookName]) {
                logger_1.logger.debug('Running hook %s of plugin %s.', hookName, hook.npmName);
                result = yield (0, hooks_1.internalRunHook)(hook.handler, hookType, result, params, err => {
                    logger_1.logger.error('Cannot run hook %s of plugin %s.', hookName, hook.pluginName, { err });
                });
            }
            return result;
        });
    }
    registerPluginsAndThemes() {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            yield this.resetCSSGlobalFile();
            const plugins = yield plugin_1.PluginModel.listEnabledPluginsAndThemes();
            for (const plugin of plugins) {
                try {
                    yield this.registerPluginOrTheme(plugin);
                }
                catch (err) {
                    try {
                        yield this.unregister(plugin_1.PluginModel.buildNpmName(plugin.name, plugin.type));
                    }
                    catch (_a) {
                    }
                    logger_1.logger.error('Cannot register plugin %s, skipping.', plugin.name, { err });
                }
            }
            this.sortHooksByPriority();
        });
    }
    unregister(npmName) {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            logger_1.logger.info('Unregister plugin %s.', npmName);
            const plugin = this.getRegisteredPluginOrTheme(npmName);
            if (!plugin) {
                throw new Error(`Unknown plugin ${npmName} to unregister`);
            }
            delete this.registeredPlugins[plugin.npmName];
            this.deleteTranslations(plugin.npmName);
            if (plugin.type === plugin_type_1.PluginType.PLUGIN) {
                yield plugin.unregister();
                for (const key of Object.keys(this.hooks)) {
                    this.hooks[key] = this.hooks[key].filter(h => h.npmName !== npmName);
                }
                const store = plugin.registerHelpers;
                store.reinitVideoConstants(plugin.npmName);
                store.reinitTranscodingProfilesAndEncoders(plugin.npmName);
                logger_1.logger.info('Regenerating registered plugin CSS to global file.');
                yield this.regeneratePluginGlobalCSS();
            }
        });
    }
    install(toInstall, version, fromDisk = false) {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            let plugin;
            let npmName;
            logger_1.logger.info('Installing plugin %s.', toInstall);
            try {
                fromDisk
                    ? yield (0, yarn_1.installNpmPluginFromDisk)(toInstall)
                    : yield (0, yarn_1.installNpmPlugin)(toInstall, version);
                npmName = fromDisk ? (0, path_1.basename)(toInstall) : toInstall;
                const pluginType = plugin_1.PluginModel.getTypeFromNpmName(npmName);
                const pluginName = plugin_1.PluginModel.normalizePluginName(npmName);
                const packageJSON = yield this.getPackageJSON(pluginName, pluginType);
                this.sanitizeAndCheckPackageJSONOrThrow(packageJSON, pluginType);
                [plugin] = yield plugin_1.PluginModel.upsert({
                    name: pluginName,
                    description: packageJSON.description,
                    homepage: packageJSON.homepage,
                    type: pluginType,
                    version: packageJSON.version,
                    enabled: true,
                    uninstalled: false,
                    peertubeEngine: packageJSON.engine.peertube
                }, { returning: true });
                logger_1.logger.info('Successful installation of plugin %s.', toInstall);
                yield this.registerPluginOrTheme(plugin);
            }
            catch (rootErr) {
                logger_1.logger.error('Cannot install plugin %s, removing it...', toInstall, { err: rootErr });
                try {
                    yield this.uninstall(npmName);
                }
                catch (err) {
                    logger_1.logger.error('Cannot uninstall plugin %s after failed installation.', toInstall, { err });
                    try {
                        yield (0, yarn_1.removeNpmPlugin)(npmName);
                    }
                    catch (err) {
                        logger_1.logger.error('Cannot remove plugin %s after failed installation.', toInstall, { err });
                    }
                }
                throw rootErr;
            }
            return plugin;
        });
    }
    update(toUpdate, fromDisk = false) {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            const npmName = fromDisk ? (0, path_1.basename)(toUpdate) : toUpdate;
            logger_1.logger.info('Updating plugin %s.', npmName);
            let version;
            if (!fromDisk) {
                const plugin = yield plugin_1.PluginModel.loadByNpmName(toUpdate);
                version = plugin.latestVersion;
            }
            yield this.unregister(npmName);
            return this.install(toUpdate, version, fromDisk);
        });
    }
    uninstall(npmName) {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            logger_1.logger.info('Uninstalling plugin %s.', npmName);
            try {
                yield this.unregister(npmName);
            }
            catch (err) {
                logger_1.logger.warn('Cannot unregister plugin %s.', npmName, { err });
            }
            const plugin = yield plugin_1.PluginModel.loadByNpmName(npmName);
            if (!plugin || plugin.uninstalled === true) {
                logger_1.logger.error('Cannot uninstall plugin %s: it does not exist or is already uninstalled.', npmName);
                return;
            }
            plugin.enabled = false;
            plugin.uninstalled = true;
            yield plugin.save();
            yield (0, yarn_1.removeNpmPlugin)(npmName);
            logger_1.logger.info('Plugin %s uninstalled.', npmName);
        });
    }
    registerPluginOrTheme(plugin) {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            const npmName = plugin_1.PluginModel.buildNpmName(plugin.name, plugin.type);
            logger_1.logger.info('Registering plugin or theme %s.', npmName);
            const packageJSON = yield this.getPackageJSON(plugin.name, plugin.type);
            const pluginPath = this.getPluginPath(plugin.name, plugin.type);
            this.sanitizeAndCheckPackageJSONOrThrow(packageJSON, plugin.type);
            let library;
            let registerHelpers;
            if (plugin.type === plugin_type_1.PluginType.PLUGIN) {
                const result = yield this.registerPlugin(plugin, pluginPath, packageJSON);
                library = result.library;
                registerHelpers = result.registerStore;
            }
            const clientScripts = {};
            for (const c of packageJSON.clientScripts) {
                clientScripts[c.script] = c;
            }
            this.registeredPlugins[npmName] = {
                npmName,
                name: plugin.name,
                type: plugin.type,
                version: plugin.version,
                description: plugin.description,
                peertubeEngine: plugin.peertubeEngine,
                path: pluginPath,
                staticDirs: packageJSON.staticDirs,
                clientScripts,
                css: packageJSON.css,
                registerHelpers: registerHelpers || undefined,
                unregister: library ? library.unregister : undefined
            };
            yield this.addTranslations(plugin, npmName, packageJSON.translations);
        });
    }
    registerPlugin(plugin, pluginPath, packageJSON) {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            const npmName = plugin_1.PluginModel.buildNpmName(plugin.name, plugin.type);
            const modulePath = (0, path_1.join)(pluginPath, packageJSON.library);
            (0, decache_1.default)(modulePath);
            const library = require(modulePath);
            if (!(0, plugins_1.isLibraryCodeValid)(library)) {
                throw new Error('Library code is not valid (miss register or unregister function)');
            }
            const { registerOptions, registerStore } = this.getRegisterHelpers(npmName, plugin);
            yield (0, fs_extra_1.ensureDir)(registerOptions.peertubeHelpers.plugin.getDataDirectoryPath());
            yield library.register(registerOptions);
            logger_1.logger.info('Add plugin %s CSS to global file.', npmName);
            yield this.addCSSToGlobalFile(pluginPath, packageJSON.css);
            return { library, registerStore };
        });
    }
    addTranslations(plugin, npmName, translationPaths) {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            for (const locale of Object.keys(translationPaths)) {
                const path = translationPaths[locale];
                const json = yield (0, fs_extra_1.readJSON)((0, path_1.join)(this.getPluginPath(plugin.name, plugin.type), path));
                const completeLocale = (0, core_utils_1.getCompleteLocale)(locale);
                if (!this.translations[completeLocale])
                    this.translations[completeLocale] = {};
                this.translations[completeLocale][npmName] = json;
                logger_1.logger.info('Added locale %s of plugin %s.', completeLocale, npmName);
            }
        });
    }
    deleteTranslations(npmName) {
        for (const locale of Object.keys(this.translations)) {
            delete this.translations[locale][npmName];
            logger_1.logger.info('Deleted locale %s of plugin %s.', locale, npmName);
        }
    }
    resetCSSGlobalFile() {
        client_html_1.ClientHtml.invalidCache();
        return (0, fs_extra_1.outputFile)(constants_1.PLUGIN_GLOBAL_CSS_PATH, '');
    }
    addCSSToGlobalFile(pluginPath, cssRelativePaths) {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            for (const cssPath of cssRelativePaths) {
                yield this.concatFiles((0, path_1.join)(pluginPath, cssPath), constants_1.PLUGIN_GLOBAL_CSS_PATH);
            }
            client_html_1.ClientHtml.invalidCache();
        });
    }
    concatFiles(input, output) {
        return new Promise((res, rej) => {
            const inputStream = (0, fs_1.createReadStream)(input);
            const outputStream = (0, fs_1.createWriteStream)(output, { flags: 'a' });
            inputStream.pipe(outputStream);
            inputStream.on('end', () => res());
            inputStream.on('error', err => rej(err));
        });
    }
    regeneratePluginGlobalCSS() {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            yield this.resetCSSGlobalFile();
            for (const plugin of this.getRegisteredPlugins()) {
                yield this.addCSSToGlobalFile(plugin.path, plugin.css);
            }
        });
    }
    sortHooksByPriority() {
        for (const hookName of Object.keys(this.hooks)) {
            this.hooks[hookName].sort((a, b) => {
                return b.priority - a.priority;
            });
        }
    }
    getPackageJSON(pluginName, pluginType) {
        const pluginPath = (0, path_1.join)(this.getPluginPath(pluginName, pluginType), 'package.json');
        return (0, fs_extra_1.readJSON)(pluginPath);
    }
    getPluginPath(pluginName, pluginType) {
        const npmName = plugin_1.PluginModel.buildNpmName(pluginName, pluginType);
        return (0, path_1.join)(config_1.CONFIG.STORAGE.PLUGINS_DIR, 'node_modules', npmName);
    }
    getAuth(npmName, authName) {
        const plugin = this.getRegisteredPluginOrTheme(npmName);
        if (!plugin || plugin.type !== plugin_type_1.PluginType.PLUGIN)
            return null;
        let auths = plugin.registerHelpers.getIdAndPassAuths();
        auths = auths.concat(plugin.registerHelpers.getExternalAuths());
        return auths.find(a => a.authName === authName);
    }
    getRegisteredPluginsOrThemes(type) {
        const plugins = [];
        for (const npmName of Object.keys(this.registeredPlugins)) {
            const plugin = this.registeredPlugins[npmName];
            if (plugin.type !== type)
                continue;
            plugins.push(plugin);
        }
        return plugins;
    }
    getRegisterHelpers(npmName, plugin) {
        const onHookAdded = (options) => {
            if (!this.hooks[options.target])
                this.hooks[options.target] = [];
            this.hooks[options.target].push({
                npmName: npmName,
                pluginName: plugin.name,
                handler: options.handler,
                priority: options.priority || 0
            });
        };
        const registerHelpers = new register_helpers_1.RegisterHelpers(npmName, plugin, onHookAdded.bind(this));
        return {
            registerStore: registerHelpers,
            registerOptions: registerHelpers.buildRegisterHelpers()
        };
    }
    sanitizeAndCheckPackageJSONOrThrow(packageJSON, pluginType) {
        if (!packageJSON.staticDirs)
            packageJSON.staticDirs = {};
        if (!packageJSON.css)
            packageJSON.css = [];
        if (!packageJSON.clientScripts)
            packageJSON.clientScripts = [];
        if (!packageJSON.translations)
            packageJSON.translations = {};
        const { result: packageJSONValid, badFields } = (0, plugins_1.isPackageJSONValid)(packageJSON, pluginType);
        if (!packageJSONValid) {
            const formattedFields = badFields.map(f => `"${f}"`)
                .join(', ');
            throw new Error(`PackageJSON is invalid (invalid fields: ${formattedFields}).`);
        }
    }
    static get Instance() {
        return this.instance || (this.instance = new this());
    }
}
exports.PluginManager = PluginManager;
