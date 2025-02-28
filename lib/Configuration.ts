import { TeamConfiguration, TeamConfigurationData } from "../Data/TeamConfiguration";

class Configuration {

  private readonly teams: { [key: string]: TeamConfiguration; } = {};

  constructor() {
    for (const team of TeamConfigurationData) {
      this.teams[team.name] = team;
    }
  }

  public findTeam(name: string): TeamConfiguration {
    return this.teams[name];
  }
}

export const Config: Configuration = new Configuration();
