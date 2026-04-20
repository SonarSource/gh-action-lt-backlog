/*
 * Backlog Automation
 * Copyright (C) SonarSource Sàrl
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
import * as core from '@actions/core';
import * as github from '@actions/github';
export class Action {
    repo;
    context;
    payload;
    constructor() {
        this.context = github.context;
        this.repo = github.context.repo;
        this.payload = github.context.payload;
    }
    async run() {
        try {
            await this.execute();
            this.log('Done');
        }
        catch (ex) {
            const error = ex;
            core.setFailed(error.message);
            console.log();
            console.log(error.stack);
        }
    }
    log(line) {
        console.log(line);
    }
    logSerialized(value) {
        console.log(this.serializeToString(value));
    }
    addRepo(other) {
        return { ...this.repo, ...other };
    }
    setFailed(message) {
        this.setFailedCore(`Action failed: ${message}`);
    }
    setFailedCore(message) {
        core.setFailed(message);
    }
    serializeToString(value) {
        return JSON.stringify(value, undefined, 2);
    }
}
//# sourceMappingURL=Action.js.map