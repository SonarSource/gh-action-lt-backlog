type RestStub = {
  issues: {
    createComment: (params: any) => void,
    get: (params: any) => any,
    listComments: (params: any) => any
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
        return {
          data: []
        }
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
