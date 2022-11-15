import { Action } from "../lib/Action";

class LogPayload extends Action {
    protected async execute(): Promise<void> {
        this.log("--- Event payload ---");
        this.logSerialized(this.payload);
        this.log("----------");
    }
}

const action = new LogPayload();
action.run();