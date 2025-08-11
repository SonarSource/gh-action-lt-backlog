import { RestEndpointMethods } from '@octokit/plugin-rest-endpoint-methods/dist-types/generated/method-types';
import { GraphQlQueryResponseData } from '@octokit/graphql';

// This provides typed access to the internal members of OctokitAction for unit testing
export type OctokitActionStub = {
  jira: any;
  rest: RestEndpointMethods;
  isEngXpSquad: boolean;
  sendGraphQL(query: string): Promise<GraphQlQueryResponseData>;
  findEmail(login: string): Promise<string>;
  sendSlackPost(url: string, jsonRequest: any): Promise<any>;
};
