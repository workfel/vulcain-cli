import * as fs from 'fs'
import * as path from 'path'
var Promise = require('promise');
var rest = require('unirest')

export abstract class AbstractCommand {

    private configFilePath: string;
    private homedir: string;
    private configDir: string;
    private static config;
    
    constructor(protected vorpal) {
        this.homedir = (process.platform === 'win32') ? process.env.APPDATA : process.env.HOME;
        this.configDir = path.join(this.homedir, ".vulcain");
        this.configFilePath = path.join(this.configDir, "config.json");
    }

    protected createRequest(paths: Array<string>, query) {
        var options = this.readOptions();
        if (!options.server || !options.token) return null;
        
        let q = "";
        let sep = "?";
        for (var p in query) {
            if (!query.hasOwnProperty(p) || !query[p]) continue;
            q += sep + p + "=" + query[p];
            sep = "&";
        }
        return rest.get(options.server + "/api/v1/" + paths.join("/") + q)
            .header('Accept', 'application/json')
            .header('Authorization', "ApiKey " + options.token);
    }
    
    protected readOptions() {

        if (!AbstractCommand.config) {
            AbstractCommand.config = {};
            if (fs.existsSync(this.configFilePath)) {
                try {
                    AbstractCommand.config = JSON.parse(fs.readFileSync(this.configFilePath, { encoding: "utf8" }));
                }
                catch (e) { }
            }
        }
        return AbstractCommand.config;
    }

    protected saveOptions(config)
    {
        if (!fs.existsSync(this.homedir))
            fs.mkdirSync(this.homedir);
        if (!fs.existsSync(this.configDir))
            fs.mkdirSync(this.configDir);

        AbstractCommand.config = config;
        fs.writeFileSync(this.configFilePath, JSON.stringify(config), { encoding: "utf8" });
        console.log("Settings saved.");
    }

    protected checkArguments(args, errors) {
        if (!args.server) {
            errors.push("Server address is required. Use --server or -H option.")
        }
        if (!args.token) {
            errors.push("Token is required. Use --token option.")
        }
    }

    protected prepareOptions(args)
    {
        let errors = [];
        let config = this.readOptions();

        args.baseDir = process.cwd();
        args.defaultFolder = config.defaultFolder;
        
        // Merge config
        if (!args.server) {
            args.server = config.server;
        }
        if(args.server) {
            if( !/^https?/i.test(args.server))
                args.server = "http://" + args.server;
        }
        if (!args.token && config.token) {
            args.token = config.token;
        }
        if (!args.team) {
            args.team = config.team;
        }
        if (!args.folder) {
            args.folder = config.folder;
        }
        if (!args.env) {
            args.env = config.env;
        }
        if (!args.template) {
            args.template = config.template;
        }
            
        this.checkArguments(args, errors);

        if (errors.length > 0) {
            for (var error in errors) {
                this.vorpal.log("  " + errors[error]);
            }
            return null;
        }        
        return args;
    }
}