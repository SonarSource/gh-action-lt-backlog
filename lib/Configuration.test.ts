import { Config } from './Configuration';

describe('Configuration', () => {
  it('findTeam finds team by name', () => {
    expect(Config.findTeam('.NET Squad')).toEqual({ name: '.NET Squad', boardId: 1737 });
  });

  it('findTeam returns null', () => {
    expect(Config.findTeam('Nonexistent')).toBeNull();
  });
});
