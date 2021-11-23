"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.down = exports.up = void 0;
const tslib_1 = require("tslib");
const Sequelize = (0, tslib_1.__importStar)(require("sequelize"));
function up(utils) {
    const q = utils.queryInterface;
    const data = {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
    };
    return q.addColumn('user', 'autoPlayVideo', data);
}
exports.up = up;
function down(options) {
    throw new Error('Not implemented.');
}
exports.down = down;
