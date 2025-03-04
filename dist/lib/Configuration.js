"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Config = void 0;
const TeamConfiguration_1 = require("../Data/TeamConfiguration");
class Configuration {
    constructor() {
        this.teams = {};
        for (const team of TeamConfiguration_1.TeamConfigurationData) {
            this.teams[team.name] = team;
        }
    }
    findTeam(name) {
        return name == null ? null : this.teams[name];
    }
}
exports.Config = new Configuration();
//# sourceMappingURL=Configuration.js.map