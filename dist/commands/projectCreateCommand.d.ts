import { AbstractCommand } from './abstractCommand';
export declare class ProjectCreateCommand extends AbstractCommand {
    constructor(vorpal: any);
    private templateAutoCompletion(input, callback);
    protected checkArguments(args: any, errors: any): void;
    private exec(vorpal, args, done);
}
