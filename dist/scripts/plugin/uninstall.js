"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const register_ts_paths_1 = require("../../server/helpers/register-ts-paths");
(0, register_ts_paths_1.registerTSPaths)();
const database_1 = require("../../server/initializers/database");
const commander_1 = require("commander");
const plugin_manager_1 = require("../../server/lib/plugins/plugin-manager");
commander_1.program
    .option('-n, --npm-name [npmName]', 'Package name to install')
    .parse(process.argv);
const options = commander_1.program.opts();
if (!options.npmName) {
    console.error('You need to specify the plugin name.');
    process.exit(-1);
}
run()
    .then(() => process.exit(0))
    .catch(err => {
    console.error(err);
    process.exit(-1);
});
function run() {
    return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
        yield (0, database_1.initDatabaseModels)(true);
        const toUninstall = options.npmName;
        yield plugin_manager_1.PluginManager.Instance.uninstall(toUninstall);
    });
}
