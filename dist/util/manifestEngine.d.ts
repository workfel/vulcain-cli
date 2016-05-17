export declare class Engine {
    meta: any;
    private manifestPath;
    private manifest;
    constructor(meta: any);
    updateMeta(info: any): void;
    readManifest(): any;
    transform(): void;
    displayMessage(step: string): void;
    execScripts(step?: string): void;
    private exec(command);
    private resolveProperty(name);
    private rename(filter, pattern, target);
    private chmod(filter, mode);
    private replace(filter, data);
}
