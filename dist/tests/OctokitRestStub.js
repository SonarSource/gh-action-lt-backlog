"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOctokitRestStub = createOctokitRestStub;
function createOctokitRestStub(title, body, login = 'test-user') {
    return {
        issues: {
            createComment(params) {
                console.log(`Invoked rest.issues.createComment(${JSON.stringify(params)})`);
            },
            listComments(params) {
                return {
                    data: []
                };
            }
        },
        pulls: {
            get(params) {
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
            update(params) {
                console.log(`Invoked rest.pulls.update(${JSON.stringify(params)})`);
            }
        }
    };
}
//# sourceMappingURL=OctokitRestStub.js.map