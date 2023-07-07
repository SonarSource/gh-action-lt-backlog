For multiple of these actions, you need to get the column_id for parameters. Here are the instructions on how to retrieve them.

## Create personal access token

Create a personal access token (classic) with permissions for:
- project

[docs](https://docs.github.com/en/enterprise-server@3.9/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)

### Save it

Save it in your shell like this:

```bash
TOKEN=YOUR_GITHUB_PERSONAL_TOKEN
```

Or set it as a `Authorization` header in [GraphiQL](https://github.com/graphql/graphiql) like this:

```
bearer YOUR_GITHUB_PERSONAL_TOKEN
```

## Find data for Projects V2

### Find project number

The project number is available in the URL of your project as: https://github.com/orgs/SonarSource/projects/<NUMBER>


### Find the column ID

To get the column ids, use the following query:

```graphql
query ($org: String!, $projectNumber: Int!) {
  organization(login: $org) {
    projectV2(number: $projectNumber) {
      field(name: "Status") {
        ... on ProjectV2SingleSelectField {
          columns: options {
            id
            name
          }
        }
      }
    }
  }
}

# query variables
{
  "org": "SonarSource",
  "projectNumber": NUMBER
}
```

[docs](https://docs.github.com/en/issues/planning-and-tracking-with-projects/automating-your-project/using-the-api-to-manage-projects#finding-the-node-id-of-an-organization-project)

## Find column id for Projects (classic)

Copy the column link and retrieve the id from the end of the URL

