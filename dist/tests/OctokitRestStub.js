"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOctokitRestStub = createOctokitRestStub;
function createOctokitRestStub(title, body, login = 'test-user') {
    return {
        issues: {
            createComment(params) {
                console.log(`Invoked rest.issues.createComment(${JSON.stringify(params)})`);
            },
            get(params) {
                return {
                    data: {
                        number: 24,
                        title: "Issue title"
                    }
                };
            },
            listComments(params) {
                console.log(`Invoked rest.issues.listComments(${JSON.stringify(params)})`);
                return {
                    data: []
                };
            },
            update(params) {
                console.log(`Invoked rest.issues.update(${JSON.stringify(params)})`);
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