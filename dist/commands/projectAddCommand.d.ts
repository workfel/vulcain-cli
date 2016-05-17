import { AbstractCommand } from './abstractCommand';
export declare class ProjectAddCommand extends AbstractCommand {
    constructor(vorpal: any);
    protected checkArguments(args: any, errors: any): void;
    private exec(vorpal, args, done);
}
