"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Configuration_1 = require("./Configuration");
describe('Configuration', () => {
    it('findTeam finds team by name', () => {
        expect(Configuration_1.Config.findTeam('.NET Squad')).toEqual({ name: '.NET Squad', boardId: 1737 });
    });
    it('findTeam returns null', () => {
        expect(Configuration_1.Config.findTeam('Nonexistent')).toBeNull();
    });
});
//# sourceMappingURL=Configuration.test.js.map