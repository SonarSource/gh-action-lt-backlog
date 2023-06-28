For multiple of these actions, you need to get the column_id for parameters. Here are the instructions on how to retrieve them.

## Create personal access token

Create a personal access token (classic) with permissions for:
- repo
- workflow
- user
- project

[docs](https://docs.github.com/en/enterprise-server@3.9/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)

### Save it

Save it in your shell like this:

```bash
TOKEN=YOUR_GITHUB_PERSONAL_TOKEN
```

Or set it as a `Authorization` header in GraphiQL (in every tag) like this:

```
bearer YOUR_GITHUB_PERSONAL_TOKEN
```

## Find column id for Projects V2

### Find project number

The project number is available in the URL of your project as: https://github.com/orgs/SonarSource/projects/NUMBER

The organisation is `SonarSource`.

To get the column ids, use the following query:

```graphql
query ($org: String!, $number: Int!) {
  organization(login: $org) {
    projectV2(number: $number) {
      id
      fields(first: 20) {
        nodes {
          ... on ProjectV2Field {
            id
            name
          }
          ... on ProjectV2SingleSelectField {
            id
            name
            options {
              id
              name
            }
          }
        }
      }
    }
  }
}

{
  "org": "SonarSource",
  "number": 8
}
```

[docs](https://docs.github.com/en/issues/planning-and-tracking-with-projects/automating-your-project/using-the-api-to-manage-projects#finding-the-node-id-of-an-organization-project)



