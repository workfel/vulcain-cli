export declare enum Action {
    AddExistingProject = 1,
    DontRegister = 2,
    Create = 4,
    Clone = 8,
}
export declare class CreateProjectExecutor {
    private vorpal;
    private options;
    private action;
    private requestData;
    private engine;
    private doNotRemoveFolder;
    constructor(vorpal: any, options: any, action: Action);
    private sendRequest(request);
    private prepareFolder(info);
    executeAsync(): Promise<boolean>;
    protected runClone(info: any): Promise<boolean>;
    protected runCreate(info: any): Promise<boolean>;
    private mkdir(path);
    private mkdirRecursive(base, chunks);
    private registerService(dir, info);
    private deleteFolderRecursive(path, first?);
    private createNewGitRepository(local);
    private gitCommit(newRepositoryUrl);
    clone(templateUrl: string, folder: string): Promise<string>;
}
