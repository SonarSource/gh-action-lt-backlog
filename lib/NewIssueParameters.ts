import { AtlassianDocument } from "./AtlassianDocumentFormat";

// New fields of this interface should be tested via JiraClient.test.ts / createIssue
export interface NewIssueParameters {
    issuetype: { name: string; };
    labels?: string[];
    parent?: { key: string; };
    reporter?: { id: string; };
    description?: AtlassianDocument;
    customfield_10001?: string; // This is how Patlassian* named teamId in Jira
    customfield_10020?: number; // How would you name a sprintId? Oh, I know...
}
