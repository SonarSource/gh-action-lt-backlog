type RestStub = {
  issues: {
    createComment: (params: any) => void,
    get: (params: any) => any,
    listComments: (params: any) => any
    update: (params: any) => any
  }
  pulls: {
    get: (params: any) => any,
    update: (params: any) => void
  }
}

export function createOctokitRestStub(title: string, body?: string, login: string = 'test-user'): RestStub {
  return {
    issues: {
      createComment(params: any): void {
        console.log(`Invoked rest.issues.createComment(${JSON.stringify(params)})`);
      },
      get(params: any): any {
        return {
          data: {
            number: 24,
            title: "Issue title"
          }
        }
      },
      listComments(params: any): any {
        console.log(`Invoked rest.issues.listComments(${JSON.stringify(params)})`);
        return {
          data: []
        }
      },
      update(params: any): void {
        console.log(`Invoked rest.issues.update(${JSON.stringify(params)})`);
      }
    },
    pulls: {
      get(params: any): any {
        return {
          data: {
            number: 42,
            title,
            body,
            html_url: 'https://github.com/test-owner/test-repo/pull/42',
            base: {
              repo: {
                name: 'test-repo'
              }
            },
            user: {
              login,
            }
          }
        };
      },
      update(params: any): void {
        console.log(`Invoked rest.pulls.update(${JSON.stringify(params)})`);
      }
    }
  }
}
