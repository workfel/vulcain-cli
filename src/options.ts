//   Licensed under the Apache License, Version 2.0 (the "License");
//   you may not use this file except in compliance with the License.
//   You may obtain a copy of the License at
//
//       http://www.apache.org/licenses/LICENSE-2.0
//
//   Unless required by applicable law or agreed to in writing, software
//   distributed under the License is distributed on an "AS IS" BASIS,
//   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//   See the License for the specific language governing permissions and
//   limitations under the License.
//
//    Copyright (c) Zenasoft
//
import {DefaultArgument, Argument, Verb, Section} from './flags'

export class GlobalOptions {
    server:string;
    token:string;
}

export class ProjectOptions extends GlobalOptions {
    @Argument({description:"Clone a template (Doesn't register the project)"})
    clone:boolean;
    @DefaultArgument({description:"Project name"})
    project:string;
    @Argument({description:"Project description"})
    description:string;
    @Argument({description:"Target environment."})
    env:string;
    @Argument({description:"Add project from this folder", alias:"f", defaultValue:null})
    folder:string;  
    @Argument({name:"team", description:"Team name", env:"VULCAIN_TEAM"})
    team:string;
} 

/**
 * Clone project options
 */
export class CloneOptions extends GlobalOptions 
{
    @Argument({description:"Project environment."})
    env:string;
    @DefaultArgument({description:"Project name"})
    project:string;  
    @Argument({name:"team", description:"Team name", env:"VULCAIN_TEAM"})
    team:string;
}

/**
 * Create project options
 */
export class CreateOptions extends ProjectOptions 
{
    @Argument({description:"Template used to create a new project", "alias":"t"})
    template:string;    
}

export class ProjectSectionOptions 
{
    @Verb({description:"Create a new project", handler:"createProject"})
    create:CreateOptions;    
    @Verb({description:"Add an existing project", handler:"addProject"})
    add:ProjectOptions;
    @Verb({description:"Create a new project from template without registration", handler:"testProject"})
    test:CreateOptions;
    @Verb({description:"Clone an existing project", handler:"cloneProject"})
    clone:CloneOptions;
}

/**
 * Config options
 */
export class ConfigOptions extends GlobalOptions  
{
    @Argument({description:"Template used to create a new project"})
    template:string;  
    @Argument({description:"Target environment."})
    env:string;
    @Argument({description:"Add project from this folder", alias:"f", defaultValue:null})
    folder:string;  
    @Argument({name:"team", description:"Team name", env:"VULCAIN_TEAM"})
    team:string;
}

export class MainOptions 
{
    @Argument({name:"H", description:"Vulcain server address", env:"VULCAIN_SERVER"})
    server:string;
    @Argument({name:"token", description:"Vulcain api key", env:"VULCAIN_API_KEY"})
    token:string;
    
    @Section({description:"Manage project"})
    project:ProjectSectionOptions;    
    
    @Verb({description:"List availabled templates.", handler:"listTemplates"})
    templates:string
    
    @Verb({description:"Initialize developement environment for a team.", handler:"initContext"})
    init:string
    
    @Verb({description:"Configure global arguments.", handler:"config"})
    config:ConfigOptions;    
}


