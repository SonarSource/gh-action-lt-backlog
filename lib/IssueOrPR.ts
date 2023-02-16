// All items that are shared between Issue and PullRequest can be added here for unified processing
export type IssueOrPR = {
  state: string;
  id: number;
  number: number;
  url: string;
  issue_url?: string; // Present only on PRs
};
