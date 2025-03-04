export interface TeamConfiguration {
  name: string;
  boardId?: number;
}

// If a new Jira issue is created for a standalone PR, it will be assigned to a sprint from a board defined by this file.
// If a new team or default board is created, this file should be updated accordingly.
export const TeamConfigurationData: TeamConfiguration[] = [
  { name: ".NET Squad", boardId: 1737 },
// ToDo: { name: "AI Agents squad", boardId: },
  { name: "Architecture Squad", boardId: 1561 },
  { name: "Analysis Processing Squad", boardId: 1443 },
  { name: "Billing-Squad", boardId: 1536 },
  { name: "CFamily Squad", boardId: 173 },
  { name: "Cloud Platform", boardId: 1442 },
  { name: "Cloud Security", boardId: 1462 },
  { name: "Code Data Storage AutoScan", boardId: 1610 },
  { name: "Code Generation", boardId: 1569 },
  { name: "Dashboard & Reporting Squad", boardId: 1555 },
  { name: "Data", boardId: 1466 },
  { name: "DBD Squad", boardId: 1638 },
  { name: "Engineering Experience Squad", boardId: 1551 },
  { name: "Front-End Engineering", boardId: 1444 },
  { name: "IDE Experience Squad", boardId: 1527 },
  { name: "Identity Squad", boardId: 1448 },
  { name: "Integration Squad", boardId: 1438 },
  { name: "JVM Squad", boardId: 1671 },
  { name: "Mobile Security", boardId: 1608 },
  { name: "On-Prem squad", boardId: 1548 },
  { name: "Python / Data-ML Squad", boardId: 1572 },
  { name: "RAD Squad", boardId: 1770 },
  { name: "Security SCA", boardId: 1803 },
  { name: "Security Engine", boardId: 371 },
  { name: "SDLC Data Squad", boardId: 2034 },
  { name: "Taint Analysis", boardId: 371 },
  { name: "Web Squad", boardId: 1672 },
  { name: "Workflow & Standards Squad", boardId: 1550 },
];
