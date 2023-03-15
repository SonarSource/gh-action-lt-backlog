import { OctokitAction } from './OctokitAction';
import { graphql, GraphQlQueryResponseData } from '@octokit/graphql';
import * as graphqlTypes from '@octokit/graphql/dist-types/types';

export abstract class GraphQLAction extends OctokitAction {
  private readonly graphqlWithAuth: graphqlTypes.graphql;

  constructor() {
    super();
    this.graphqlWithAuth = graphql.defaults({
      headers: {
        authorization: `token ${this.getInput('github-token')}`,
      },
    });
  }

  protected sendGraphQL(query: string): Promise<GraphQlQueryResponseData> {
    return this.graphqlWithAuth(query);
  }
}
