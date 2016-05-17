import { AbstractCommand } from './abstractCommand';
export declare class ConfigCommand extends AbstractCommand {
    constructor(vorpal: any);
    private teamAutoCompletion(input, callback);
    private exec(args);
}
