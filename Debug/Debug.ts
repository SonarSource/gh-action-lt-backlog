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

import { OctokitAction } from '../lib/OctokitAction.js';

type OnCallUser = {
  name: string;
  email: string;
};

export class Debug extends OctokitAction {
  override async execute(): Promise<void> {
    const result = await this.readRootlyOnCall('Cloud Engineering Squad - Triager');
    this.log(JSON.stringify(result));
  }

  private async readRootlyOnCall(scheduleName: string): Promise<OnCallUser | null> {
    this.log(`Loading Rootly on-call for schedule: ${scheduleName}`);
    // FIXME: Schedule
    // const schedulesData = await this.sendRootlyGet(`schedules?filter[name]=${encodeURIComponent(scheduleName)}`);
    // const scheduleId = schedulesData?.data?.[0]?.id;
    // if (!scheduleId) {
    //   this.log('Schedule not found');
    //   return null;
    // }
    // // a8f6f785-aea9-4647-8200-f249dfd5fa70
    // this.log(`Schedule ID: ${scheduleId}`);

    // const oncallData = await this.sendRootlyGet(`oncalls?filter[schedule_ids]=${scheduleId}&include=user`);
    //const oncallData = await this.sendRootlyGet(`oncalls?include=user,schedule&earliest=true`);

    // const data = await this.sendRootlyGet(`schedules?filter[name]=${encodeURIComponent(scheduleName)}`);
    // this.logSerialized(data);

    // const data = await this.sendRootlyGet(`schedules/a8f6f785-aea9-4647-8200-f249dfd5fa70`);
    // this.logSerialized(data);

    const data = await this.sendRootlyGet(`users/29784/email_addresses`);
    this.logSerialized(data);


    return null;

    // this.log('oncallData:');
    // this.logSerialized(oncallData);
    // const userId = oncallData?.data?.[0]?.relationships?.user?.data?.id;
    // const user = oncallData?.included?.find((x: any) => x.type === 'users' && x.id === userId);
    // if (!user) {
    //   this.log(`On-call user not found for schedule: ${scheduleName}`);
    //   return null;
    // }
    // return { name: user.attributes.full_name, email: user.attributes.email };
  }

  private async sendRootlyGet(path: string): Promise<any> {
    const token = this.inputString('rootly-token');
    if (!token) {
      throw new Error('rootly-token was not set');
    }
    try {
      const response = await fetch(`https://api.rootly.com/v1/${path}`, {
        headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.api+json' },
      });
      if (!response.ok) {
        this.log(`Rootly request failed. Error ${response.status}: ${response.statusText}`);
        return null;
      }
      return await response.json();
    } catch (ex) {
      this.log('Failed to send Rootly request');
      this.log((ex as Error).toString());
      return null;
    }
  }
}

const action = new Debug();
action.run();
