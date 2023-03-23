For multiple of these actions, you need to get the column_id for parameters. Here are the instructions on how to retrieve them.

## Create personal access token

[docs](https://docs.github.com/en/enterprise-server@3.4/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token)

### Save it

```bash
TOKEN=YOUR_GITHUB_PERSONAL_TOKEN
```

## Find project id

[docs](https://docs.github.com/en/issues/planning-and-tracking-with-projects/automating-your-project/using-the-api-to-manage-projects#finding-the-node-id-of-an-organization-project)

Kanban URL: https://github.com/orgs/SonarSource/projects/8

```bash
curl --request POST \
  --url https://api.github.com/graphql \
  --header "Authorization: Bearer $TOKEN" \
  --data '{"query":"query{organization(login: \"SonarSource\") {projectV2(number: 8){id}}}"}'
```

### Response

```json
{ "data": { "organization": { "projectV2": { "id": "PVT_kwDOAAhUxM4AJVQV" } } } }
```

### Save it

```bash
PROJECT_ID=PVT_kwDOAAhUxM4AJVQV
```

## Find column ids

[doc](https://docs.github.com/en/issues/planning-and-tracking-with-projects/automating-your-project/using-the-api-to-manage-projects#finding-the-node-id-of-a-field)

```bash
curl --request POST \
  --url https://api.github.com/graphql \
  --header "Authorization: Bearer $TOKEN" \
  --data "{\"query\":\"query{ node(id: \\\"$PROJECT_ID\\\") { ... on ProjectV2 { fields(first: 20) { nodes { ... on ProjectV2Field { id name } ... on ProjectV2IterationField { id name configuration { iterations { startDate id }}} ... on ProjectV2SingleSelectField { id name options { id name }}}}}}}\"}"
```

### Response

```json
{
  "data": {
    "node": {
      "fields": {
        "nodes": [
          { "id": "PVTF_lADOAAhUxM4AJVQVzgFuY1Y", "name": "Title" },
          { "id": "PVTF_lADOAAhUxM4AJVQVzgFuY1c", "name": "Assignees" },
          {
            "id": "PVTSSF_lADOAAhUxM4AJVQVzgFuY1g",
            "name": "Status",
            "options": [
              { "id": "f75ad846", "name": "Todo" },
              { "id": "47fc9ee4", "name": "In Progress" },
              { "id": "14c3336d", "name": "In Review" },
              { "id": "dd10adad", "name": "To Merge" },
              { "id": "98236657", "name": "Done" }
            ]
          },
          { "id": "PVTF_lADOAAhUxM4AJVQVzgFuY1k", "name": "Labels" },
          { "id": "PVTF_lADOAAhUxM4AJVQVzgFuY1o", "name": "Linked pull requests" },
          { "id": "PVTF_lADOAAhUxM4AJVQVzgFuY1s", "name": "Reviewers" },
          { "id": "PVTF_lADOAAhUxM4AJVQVzgFuY1w", "name": "Repository" },
          { "id": "PVTF_lADOAAhUxM4AJVQVzgFuY10", "name": "Milestone" }
        ]
      }
    }
  }
}
```

