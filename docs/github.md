# GitHub Actions params fetching

For multiple of these actions, you need to get the value for the `column-id` and `project-number` parameters. Here are the instructions on how to retrieve them.

## Projects (classic)

### Find column id

Copy the column link and retrieve the id from the end of the URL.

## Projects (V2)

### Find project number

The project number is available in the URL of your project as: `https://github.com/orgs/SonarSource/projects/<NUMBER>`

### Find column ID

#### Create personal access token

Create a personal access token (classic) with permissions for:
- `public_repo`
- `read:project`

[GitHub docs on personal token creation](https://docs.github.com/en/enterprise-server@3.9/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)

#### Query

To get the column ids, use the following command, replacing `<YOUR_GITHUB_PERSONAL_ACCESS_TOKEN>` and `<NUMBER>`:

```bash
curl -H "Content-Type: application/json" -H "Authorization: bearer <YOUR_GITHUB_PERSONAL_ACCESS_TOKEN>" -X POST -d "{ \"query\": \"query { organization(login: \u0022SonarSource\u0022) { projectV2(number: <NUMBER>) { field(name: \u0022Status\u0022) { ... on ProjectV2SingleSelectField { columns: options { id name }}}}}}\" }" https://api.github.com/graphql
```

