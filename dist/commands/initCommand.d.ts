import { AbstractCommand } from './abstractCommand';
export declare class InitCommand extends AbstractCommand {
    constructor(vorpal: any);
    private teamAutoCompletion(input, callback);
    protected checkArguments(args: any, errors: any): void;
    private exec(vorpal, args, done);
    execFromString(code: any): void;
}
