# GitHub Actions params fetching

For multiple of these actions, you need to get the value for the `column-id` parameter. Here are the instructions on how to retrieve them.

## Projects (classic)

### Find column id

Copy the column link and retrieve the id from the end of the URL

## Projects (V2)

### Find project number

The project number is available in the URL of your project as: `https://github.com/orgs/SonarSource/projects/<NUMBER>`
### Find column ID

#### Create personal access token

Create a personal access token (classic) with permissions for `read:project`.

[GitHub docs on personal token creation](https://docs.github.com/en/enterprise-server@3.9/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)
#### query

To get the column ids, use the following command, replacing `YOUR_GITHUB_PERSONAL_ACCESS_TOKEN` and `NUMBER`:

```bash
curl -H 'Content-Type: application/json' -H "Authorization: bearer <YOUR_GITHUB_PERSONAL_ACCESS_TOKEN>" -X POST -d '{ "query": "query {  organization(login: \"SonarSource\") { projectV2(number: <NUMBER>) { field(name: \"Status\") { ... on ProjectV2SingleSelectField { columns: options { id name }}}}}}" }' https://api.github.com/graphql
```

[docs](https://docs.github.com/en/issues/planning-and-tracking-with-projects/automating-your-project/using-the-api-to-manage-projects#finding-the-node-id-of-an-organization-project)

