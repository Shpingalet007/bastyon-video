"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reloadConfig = exports.isEmailEnabled = exports.registerConfigChangedHandler = exports.CONFIG = void 0;
const tslib_1 = require("tslib");
const bytes_1 = tslib_1.__importDefault(require("bytes"));
const decache_1 = tslib_1.__importDefault(require("decache"));
const path_1 = require("path");
const core_utils_1 = require("../helpers/core-utils");
let config = require('config');
const configChangedHandlers = [];
const CONFIG = {
    CUSTOM_FILE: getLocalConfigFilePath(),
    LISTEN: {
        PORT: config.get('listen.port'),
        HOSTNAME: config.get('listen.hostname')
    },
    DATABASE: {
        DBNAME: config.has('database.name') ? config.get('database.name') : 'peertube' + config.get('database.suffix'),
        HOSTNAME: config.get('database.hostname'),
        PORT: config.get('database.port'),
        SSL: config.get('database.ssl'),
        USERNAME: config.get('database.username'),
        PASSWORD: config.get('database.password'),
        POOL: {
            MAX: config.get('database.pool.max')
        }
    },
    REDIS: {
        HOSTNAME: config.has('redis.hostname') ? config.get('redis.hostname') : null,
        PORT: config.has('redis.port') ? config.get('redis.port') : null,
        SOCKET: config.has('redis.socket') ? config.get('redis.socket') : null,
        AUTH: config.has('redis.auth') ? config.get('redis.auth') : null,
        DB: config.has('redis.db') ? config.get('redis.db') : null
    },
    SMTP: {
        TRANSPORT: config.has('smtp.transport') ? config.get('smtp.transport') : 'smtp',
        SENDMAIL: config.has('smtp.sendmail') ? config.get('smtp.sendmail') : null,
        HOSTNAME: config.get('smtp.hostname'),
        PORT: config.get('smtp.port'),
        USERNAME: config.get('smtp.username'),
        PASSWORD: config.get('smtp.password'),
        TLS: config.get('smtp.tls'),
        DISABLE_STARTTLS: config.get('smtp.disable_starttls'),
        CA_FILE: config.get('smtp.ca_file'),
        FROM_ADDRESS: config.get('smtp.from_address')
    },
    EMAIL: {
        BODY: {
            SIGNATURE: config.get('email.body.signature')
        },
        SUBJECT: {
            PREFIX: config.get('email.subject.prefix') + ' '
        }
    },
    STORAGE: {
        TMP_DIR: core_utils_1.buildPath(config.get('storage.tmp')),
        ACTOR_IMAGES: core_utils_1.buildPath(config.get('storage.avatars')),
        LOG_DIR: core_utils_1.buildPath(config.get('storage.logs')),
        VIDEOS_DIR: core_utils_1.buildPath(config.get('storage.videos')),
        STREAMING_PLAYLISTS_DIR: core_utils_1.buildPath(config.get('storage.streaming_playlists')),
        REDUNDANCY_DIR: core_utils_1.buildPath(config.get('storage.redundancy')),
        THUMBNAILS_DIR: core_utils_1.buildPath(config.get('storage.thumbnails')),
        PREVIEWS_DIR: core_utils_1.buildPath(config.get('storage.previews')),
        CAPTIONS_DIR: core_utils_1.buildPath(config.get('storage.captions')),
        TORRENTS_DIR: core_utils_1.buildPath(config.get('storage.torrents')),
        CACHE_DIR: core_utils_1.buildPath(config.get('storage.cache')),
        PLUGINS_DIR: core_utils_1.buildPath(config.get('storage.plugins')),
        CLIENT_OVERRIDES_DIR: core_utils_1.buildPath(config.get('storage.client_overrides'))
    },
    OBJECT_STORAGE: {
        ENABLED: config.get('object_storage.enabled'),
        MAX_UPLOAD_PART: bytes_1.default.parse(config.get('object_storage.max_upload_part')),
        ENDPOINT: config.get('object_storage.endpoint'),
        REGION: config.get('object_storage.region'),
        CREDENTIALS: {
            ACCESS_KEY_ID: config.get('object_storage.credentials.access_key_id'),
            SECRET_ACCESS_KEY: config.get('object_storage.credentials.secret_access_key')
        },
        VIDEOS: {
            BUCKET_NAME: config.get('object_storage.videos.bucket_name'),
            PREFIX: config.get('object_storage.videos.prefix'),
            BASE_URL: config.get('object_storage.videos.base_url')
        },
        STREAMING_PLAYLISTS: {
            BUCKET_NAME: config.get('object_storage.streaming_playlists.bucket_name'),
            PREFIX: config.get('object_storage.streaming_playlists.prefix'),
            BASE_URL: config.get('object_storage.streaming_playlists.base_url')
        }
    },
    WEBSERVER: {
        SCHEME: config.get('webserver.https') === true ? 'https' : 'http',
        WS: config.get('webserver.https') === true ? 'wss' : 'ws',
        HOSTNAME: config.get('webserver.hostname'),
        PORT: config.get('webserver.port')
    },
    RATES_LIMIT: {
        API: {
            WINDOW_MS: core_utils_1.parseDurationToMs(config.get('rates_limit.api.window')),
            MAX: config.get('rates_limit.api.max')
        },
        SIGNUP: {
            WINDOW_MS: core_utils_1.parseDurationToMs(config.get('rates_limit.signup.window')),
            MAX: config.get('rates_limit.signup.max')
        },
        LOGIN: {
            WINDOW_MS: core_utils_1.parseDurationToMs(config.get('rates_limit.login.window')),
            MAX: config.get('rates_limit.login.max')
        },
        ASK_SEND_EMAIL: {
            WINDOW_MS: core_utils_1.parseDurationToMs(config.get('rates_limit.ask_send_email.window')),
            MAX: config.get('rates_limit.ask_send_email.max')
        }
    },
    TRUST_PROXY: config.get('trust_proxy'),
    LOG: {
        LEVEL: config.get('log.level'),
        ROTATION: {
            ENABLED: config.get('log.rotation.enabled'),
            MAX_FILE_SIZE: bytes_1.default.parse(config.get('log.rotation.maxFileSize')),
            MAX_FILES: config.get('log.rotation.maxFiles')
        },
        ANONYMIZE_IP: config.get('log.anonymizeIP'),
        LOG_PING_REQUESTS: config.get('log.log_ping_requests'),
        PRETTIFY_SQL: config.get('log.prettify_sql')
    },
    TRENDING: {
        VIDEOS: {
            INTERVAL_DAYS: config.get('trending.videos.interval_days'),
            ALGORITHMS: {
                get ENABLED() { return config.get('trending.videos.algorithms.enabled'); },
                get DEFAULT() { return config.get('trending.videos.algorithms.default'); }
            }
        }
    },
    REDUNDANCY: {
        VIDEOS: {
            CHECK_INTERVAL: core_utils_1.parseDurationToMs(config.get('redundancy.videos.check_interval')),
            STRATEGIES: buildVideosRedundancy(config.get('redundancy.videos.strategies'))
        }
    },
    REMOTE_REDUNDANCY: {
        VIDEOS: {
            ACCEPT_FROM: config.get('remote_redundancy.videos.accept_from')
        }
    },
    CSP: {
        ENABLED: config.get('csp.enabled'),
        REPORT_ONLY: config.get('csp.report_only'),
        REPORT_URI: config.get('csp.report_uri')
    },
    SECURITY: {
        FRAMEGUARD: {
            ENABLED: config.get('security.frameguard.enabled')
        }
    },
    TRACKER: {
        ENABLED: config.get('tracker.enabled'),
        PRIVATE: config.get('tracker.private'),
        REJECT_TOO_MANY_ANNOUNCES: config.get('tracker.reject_too_many_announces')
    },
    HISTORY: {
        VIDEOS: {
            MAX_AGE: core_utils_1.parseDurationToMs(config.get('history.videos.max_age'))
        }
    },
    VIEWS: {
        VIDEOS: {
            REMOTE: {
                MAX_AGE: core_utils_1.parseDurationToMs(config.get('views.videos.remote.max_age'))
            }
        }
    },
    PLUGINS: {
        INDEX: {
            ENABLED: config.get('plugins.index.enabled'),
            CHECK_LATEST_VERSIONS_INTERVAL: core_utils_1.parseDurationToMs(config.get('plugins.index.check_latest_versions_interval')),
            URL: config.get('plugins.index.url')
        }
    },
    FEDERATION: {
        VIDEOS: {
            FEDERATE_UNLISTED: config.get('federation.videos.federate_unlisted'),
            CLEANUP_REMOTE_INTERACTIONS: config.get('federation.videos.cleanup_remote_interactions')
        }
    },
    PEERTUBE: {
        CHECK_LATEST_VERSION: {
            ENABLED: config.get('peertube.check_latest_version.enabled'),
            URL: config.get('peertube.check_latest_version.url')
        }
    },
    ADMIN: {
        get EMAIL() { return config.get('admin.email'); }
    },
    CONTACT_FORM: {
        get ENABLED() { return config.get('contact_form.enabled'); }
    },
    SIGNUP: {
        get ENABLED() { return config.get('signup.enabled'); },
        get LIMIT() { return config.get('signup.limit'); },
        get REQUIRES_EMAIL_VERIFICATION() { return config.get('signup.requires_email_verification'); },
        get MINIMUM_AGE() { return config.get('signup.minimum_age'); },
        FILTERS: {
            CIDR: {
                get WHITELIST() { return config.get('signup.filters.cidr.whitelist'); },
                get BLACKLIST() { return config.get('signup.filters.cidr.blacklist'); }
            }
        }
    },
    USER: {
        get VIDEO_QUOTA() { return core_utils_1.parseBytes(config.get('user.video_quota')); },
        get VIDEO_QUOTA_DAILY() { return core_utils_1.parseBytes(config.get('user.video_quota_daily')); }
    },
    TRANSCODING: {
        get ENABLED() { return config.get('transcoding.enabled'); },
        get ALLOW_ADDITIONAL_EXTENSIONS() { return config.get('transcoding.allow_additional_extensions'); },
        get ALLOW_AUDIO_FILES() { return config.get('transcoding.allow_audio_files'); },
        get THREADS() { return config.get('transcoding.threads'); },
        get CONCURRENCY() { return config.get('transcoding.concurrency'); },
        get PROFILE() { return config.get('transcoding.profile'); },
        RESOLUTIONS: {
            get '0p'() { return config.get('transcoding.resolutions.0p'); },
            get '240p'() { return config.get('transcoding.resolutions.240p'); },
            get '360p'() { return config.get('transcoding.resolutions.360p'); },
            get '480p'() { return config.get('transcoding.resolutions.480p'); },
            get '720p'() { return config.get('transcoding.resolutions.720p'); },
            get '1080p'() { return config.get('transcoding.resolutions.1080p'); },
            get '1440p'() { return config.get('transcoding.resolutions.1440p'); },
            get '2160p'() { return config.get('transcoding.resolutions.2160p'); }
        },
        HLS: {
            get ENABLED() { return config.get('transcoding.hls.enabled'); }
        },
        WEBTORRENT: {
            get ENABLED() { return config.get('transcoding.webtorrent.enabled'); }
        }
    },
    LIVE: {
        get ENABLED() { return config.get('live.enabled'); },
        get MAX_DURATION() { return core_utils_1.parseDurationToMs(config.get('live.max_duration')); },
        get MAX_INSTANCE_LIVES() { return config.get('live.max_instance_lives'); },
        get MAX_USER_LIVES() { return config.get('live.max_user_lives'); },
        get ALLOW_REPLAY() { return config.get('live.allow_replay'); },
        RTMP: {
            get PORT() { return config.get('live.rtmp.port'); }
        },
        TRANSCODING: {
            get ENABLED() { return config.get('live.transcoding.enabled'); },
            get THREADS() { return config.get('live.transcoding.threads'); },
            get PROFILE() { return config.get('live.transcoding.profile'); },
            RESOLUTIONS: {
                get '240p'() { return config.get('live.transcoding.resolutions.240p'); },
                get '360p'() { return config.get('live.transcoding.resolutions.360p'); },
                get '480p'() { return config.get('live.transcoding.resolutions.480p'); },
                get '720p'() { return config.get('live.transcoding.resolutions.720p'); },
                get '1080p'() { return config.get('live.transcoding.resolutions.1080p'); },
                get '1440p'() { return config.get('live.transcoding.resolutions.1440p'); },
                get '2160p'() { return config.get('live.transcoding.resolutions.2160p'); }
            }
        }
    },
    IMPORT: {
        VIDEOS: {
            get CONCURRENCY() { return config.get('import.videos.concurrency'); },
            HTTP: {
                get ENABLED() { return config.get('import.videos.http.enabled'); },
                get FORCE_IPV4() { return config.get('import.videos.http.force_ipv4'); },
                PROXY: {
                    get ENABLED() { return config.get('import.videos.http.proxy.enabled'); },
                    get URL() { return config.get('import.videos.http.proxy.url'); }
                }
            },
            TORRENT: {
                get ENABLED() { return config.get('import.videos.torrent.enabled'); }
            }
        }
    },
    AUTO_BLACKLIST: {
        VIDEOS: {
            OF_USERS: {
                get ENABLED() { return config.get('auto_blacklist.videos.of_users.enabled'); }
            }
        }
    },
    CACHE: {
        PREVIEWS: {
            get SIZE() { return config.get('cache.previews.size'); }
        },
        VIDEO_CAPTIONS: {
            get SIZE() { return config.get('cache.captions.size'); }
        },
        TORRENTS: {
            get SIZE() { return config.get('cache.torrents.size'); }
        }
    },
    INSTANCE: {
        get NAME() { return config.get('instance.name'); },
        get SHORT_DESCRIPTION() { return config.get('instance.short_description'); },
        get DESCRIPTION() { return config.get('instance.description'); },
        get TERMS() { return config.get('instance.terms'); },
        get CODE_OF_CONDUCT() { return config.get('instance.code_of_conduct'); },
        get CREATION_REASON() { return config.get('instance.creation_reason'); },
        get MODERATION_INFORMATION() { return config.get('instance.moderation_information'); },
        get ADMINISTRATOR() { return config.get('instance.administrator'); },
        get MAINTENANCE_LIFETIME() { return config.get('instance.maintenance_lifetime'); },
        get BUSINESS_MODEL() { return config.get('instance.business_model'); },
        get HARDWARE_INFORMATION() { return config.get('instance.hardware_information'); },
        get LANGUAGES() { return config.get('instance.languages') || []; },
        get CATEGORIES() { return config.get('instance.categories') || []; },
        get IS_NSFW() { return config.get('instance.is_nsfw'); },
        get DEFAULT_NSFW_POLICY() { return config.get('instance.default_nsfw_policy'); },
        get DEFAULT_CLIENT_ROUTE() { return config.get('instance.default_client_route'); },
        CUSTOMIZATIONS: {
            get JAVASCRIPT() { return config.get('instance.customizations.javascript'); },
            get CSS() { return config.get('instance.customizations.css'); }
        },
        get ROBOTS() { return config.get('instance.robots'); },
        get SECURITYTXT() { return config.get('instance.securitytxt'); },
        get SECURITYTXT_CONTACT() { return config.get('admin.email'); }
    },
    SERVICES: {
        TWITTER: {
            get USERNAME() { return config.get('services.twitter.username'); },
            get WHITELISTED() { return config.get('services.twitter.whitelisted'); }
        }
    },
    FOLLOWERS: {
        INSTANCE: {
            get ENABLED() { return config.get('followers.instance.enabled'); },
            get MANUAL_APPROVAL() { return config.get('followers.instance.manual_approval'); }
        }
    },
    FOLLOWINGS: {
        INSTANCE: {
            AUTO_FOLLOW_BACK: {
                get ENABLED() {
                    return config.get('followings.instance.auto_follow_back.enabled');
                }
            },
            AUTO_FOLLOW_INDEX: {
                get ENABLED() {
                    return config.get('followings.instance.auto_follow_index.enabled');
                },
                get INDEX_URL() {
                    return config.get('followings.instance.auto_follow_index.index_url');
                }
            }
        }
    },
    THEME: {
        get DEFAULT() { return config.get('theme.default'); }
    },
    BROADCAST_MESSAGE: {
        get ENABLED() { return config.get('broadcast_message.enabled'); },
        get MESSAGE() { return config.get('broadcast_message.message'); },
        get LEVEL() { return config.get('broadcast_message.level'); },
        get DISMISSABLE() { return config.get('broadcast_message.dismissable'); }
    },
    SEARCH: {
        REMOTE_URI: {
            get USERS() { return config.get('search.remote_uri.users'); },
            get ANONYMOUS() { return config.get('search.remote_uri.anonymous'); }
        },
        SEARCH_INDEX: {
            get ENABLED() { return config.get('search.search_index.enabled'); },
            get URL() { return config.get('search.search_index.url'); },
            get DISABLE_LOCAL_SEARCH() { return config.get('search.search_index.disable_local_search'); },
            get IS_DEFAULT_SEARCH() { return config.get('search.search_index.is_default_search'); }
        }
    }
};
exports.CONFIG = CONFIG;
function registerConfigChangedHandler(fun) {
    configChangedHandlers.push(fun);
}
exports.registerConfigChangedHandler = registerConfigChangedHandler;
function isEmailEnabled() {
    if (CONFIG.SMTP.TRANSPORT === 'sendmail' && CONFIG.SMTP.SENDMAIL)
        return true;
    if (CONFIG.SMTP.TRANSPORT === 'smtp' && CONFIG.SMTP.HOSTNAME && CONFIG.SMTP.PORT)
        return true;
    return false;
}
exports.isEmailEnabled = isEmailEnabled;
function getLocalConfigFilePath() {
    const configSources = config.util.getConfigSources();
    if (configSources.length === 0)
        throw new Error('Invalid config source.');
    let filename = 'local';
    if (process.env.NODE_ENV)
        filename += `-${process.env.NODE_ENV}`;
    if (process.env.NODE_APP_INSTANCE)
        filename += `-${process.env.NODE_APP_INSTANCE}`;
    return path_1.join(path_1.dirname(configSources[0].name), filename + '.json');
}
function buildVideosRedundancy(objs) {
    if (!objs)
        return [];
    if (!Array.isArray(objs))
        return objs;
    return objs.map(obj => {
        return Object.assign({}, obj, {
            minLifetime: core_utils_1.parseDurationToMs(obj.min_lifetime),
            size: bytes_1.default.parse(obj.size),
            minViews: obj.min_views
        });
    });
}
function reloadConfig() {
    function getConfigDirectory() {
        if (process.env.NODE_CONFIG_DIR) {
            return process.env.NODE_CONFIG_DIR;
        }
        return path_1.join(core_utils_1.root(), 'config');
    }
    function purge() {
        const directory = getConfigDirectory();
        for (const fileName in require.cache) {
            if (fileName.includes(directory) === false) {
                continue;
            }
            delete require.cache[fileName];
        }
        decache_1.default('config');
    }
    purge();
    config = require('config');
    for (const configChangedHandler of configChangedHandlers) {
        configChangedHandler();
    }
}
exports.reloadConfig = reloadConfig;
