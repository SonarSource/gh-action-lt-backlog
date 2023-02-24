"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphQLAction = void 0;
const OctokitAction_1 = require("./OctokitAction");
const graphql_1 = require("@octokit/graphql");
class GraphQLAction extends OctokitAction_1.OctokitAction {
    constructor() {
        super();
        this.graphqlWithAuth = graphql_1.graphql.defaults({
            headers: {
                authorization: `token ${this.getInput('github-token')}`,
            },
        });
    }
    sendGraphQL(query) {
        return this.graphqlWithAuth(query);
    }
}
exports.GraphQLAction = GraphQLAction;
//# sourceMappingURL=GraphQLAction.js.map