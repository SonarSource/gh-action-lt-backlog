"use strict";
/*
 * Backlog Automation
 * Copyright (C) 2022-2025 SonarSource Sàrl
 * mailto: info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
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
                            type: login === 'renovate[bot]' ? 'Bot' : 'User'
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