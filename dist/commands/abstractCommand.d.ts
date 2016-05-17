export declare abstract class AbstractCommand {
    protected vorpal: any;
    private configFilePath;
    private homedir;
    private configDir;
    private static config;
    constructor(vorpal: any);
    protected createRequest(paths: Array<string>, query: any): any;
    protected readOptions(): any;
    protected saveOptions(config: any): void;
    protected checkArguments(args: any, errors: any): void;
    protected prepareOptions(args: any): any;
}
