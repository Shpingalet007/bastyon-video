"use strict";
var ActorCustomPageModel_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActorCustomPageModel = void 0;
const tslib_1 = require("tslib");
const sequelize_typescript_1 = require("sequelize-typescript");
const actor_1 = require("../actor/actor");
const application_1 = require("../application/application");
let ActorCustomPageModel = ActorCustomPageModel_1 = class ActorCustomPageModel extends sequelize_typescript_1.Model {
    static updateInstanceHomepage(content) {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            const serverActor = yield (0, application_1.getServerActor)();
            return ActorCustomPageModel_1.upsert({
                content,
                actorId: serverActor.id,
                type: 'homepage'
            });
        });
    }
    static loadInstanceHomepage() {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            const serverActor = yield (0, application_1.getServerActor)();
            return ActorCustomPageModel_1.findOne({
                where: {
                    actorId: serverActor.id
                }
            });
        });
    }
    toFormattedJSON() {
        return {
            content: this.content
        };
    }
};
(0, tslib_1.__decorate)([
    (0, sequelize_typescript_1.AllowNull)(true),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.TEXT),
    (0, tslib_1.__metadata)("design:type", String)
], ActorCustomPageModel.prototype, "content", void 0);
(0, tslib_1.__decorate)([
    (0, sequelize_typescript_1.AllowNull)(false),
    sequelize_typescript_1.Column,
    (0, tslib_1.__metadata)("design:type", String)
], ActorCustomPageModel.prototype, "type", void 0);
(0, tslib_1.__decorate)([
    sequelize_typescript_1.CreatedAt,
    (0, tslib_1.__metadata)("design:type", Date)
], ActorCustomPageModel.prototype, "createdAt", void 0);
(0, tslib_1.__decorate)([
    sequelize_typescript_1.UpdatedAt,
    (0, tslib_1.__metadata)("design:type", Date)
], ActorCustomPageModel.prototype, "updatedAt", void 0);
(0, tslib_1.__decorate)([
    (0, sequelize_typescript_1.ForeignKey)(() => actor_1.ActorModel),
    sequelize_typescript_1.Column,
    (0, tslib_1.__metadata)("design:type", Number)
], ActorCustomPageModel.prototype, "actorId", void 0);
(0, tslib_1.__decorate)([
    (0, sequelize_typescript_1.BelongsTo)(() => actor_1.ActorModel, {
        foreignKey: {
            name: 'actorId',
            allowNull: false
        },
        onDelete: 'cascade'
    }),
    (0, tslib_1.__metadata)("design:type", actor_1.ActorModel)
], ActorCustomPageModel.prototype, "Actor", void 0);
ActorCustomPageModel = ActorCustomPageModel_1 = (0, tslib_1.__decorate)([
    (0, sequelize_typescript_1.Table)({
        tableName: 'actorCustomPage',
        indexes: [
            {
                fields: ['actorId', 'type'],
                unique: true
            }
        ]
    })
], ActorCustomPageModel);
exports.ActorCustomPageModel = ActorCustomPageModel;
