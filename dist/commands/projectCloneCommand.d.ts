import { AbstractCommand } from './abstractCommand';
export declare class ProjectCloneCommand extends AbstractCommand {
    constructor(vorpal: any);
    private serviceAutoCompletion(input, callback);
    protected checkArguments(args: any, errors: any): void;
    private exec(vorpal, args, done);
}
