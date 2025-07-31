import { Action } from '../lib/Action';

export class LogPayload extends Action {
  protected async execute(): Promise<void> {
    this.log('--- Event payload ---');
    this.logSerialized(this.payload);
    this.log('----------');
  }
}
