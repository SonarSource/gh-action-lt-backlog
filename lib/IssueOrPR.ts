// import { components } from "@octokit/openapi-types/types.d";
// All items that are shared between components["schemas"]["issue"] and components["schemas"]["pull-request"] can be added here for unified processing
export type IssueOrPR = {
    state: string;
    id: number;
    number: number;
    url: string;
}
