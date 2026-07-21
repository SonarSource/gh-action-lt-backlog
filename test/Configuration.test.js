import { assertEqual } from './support/Assertions.js';
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Config } from '../src/helpers/Configuration.js';
describe('Configuration', () => {
  it('findTeam finds team by name', () => {
    assertEqual(Config.findTeam('Architecture Squad'), {
      name: 'Architecture Squad',
      boardId: 1561,
    }); // Any squad with boardId
  });
  it('findTeam returns null', () => {
    assert.strictEqual(Config.findTeam('Nonexistent'), null);
  });
});
