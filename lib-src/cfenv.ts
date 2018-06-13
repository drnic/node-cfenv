//  Licensed under the Apache License. See footer for details.

import * as fs from "fs";
import * as URL from "url";
import * as _ from "underscore";
import * as ports from "./ports";
import * as yaml from "js-yaml";

export interface Options {
  vcapFile?: string;
  vcap?: VCAP;
  name?: string;
}

export declare type Services = { [serviceName: string]: Service[] };

export interface VCAP {
  application: App;
  services: Services;
}

export interface Service {
  name: string;
  credentials: {[k: string]: string};
}

export interface App {
  name: string;
  host: string;
}

interface Manifest {
  applications: ManifestApp[];
}

interface ManifestApp {
  name: string;
}

interface Package {
  name: string;
}

function throwError(message: string) {
  let msg = `cfenv: ${message}`
  console.log(`error: ${message}`);
  throw new Error(msg);
}

export function getAppEnv(options?: Options) {
  return new AppEnv(options);
}

export class AppEnv {
  isLocal = false;
  app: App;
  services: Services;
  name: string;
  port: number;
  bind: string;
  urls: string[];
  url: string;

  public constructor(options?: Options) {
    try {
      JSON.parse(process.env.VCAP_APPLICATION || "");
    }
    catch (err) {
      this.isLocal = true;
    }

    options = options || {};

    if (this.isLocal) {
      this.getVcapFromFile(options);
    }

    this.app      = getApp(this, options);
    this.services = getServices(this, options);
    this.name     = getName(this, options);
    this.port     = getPort(this);
    this.bind     = getBind(this);
    this.urls     = getURLs(this, options);
    this.url      = this.urls[0];
  }

  private getVcapFromFile(options: Options) {
    if (options.vcapFile === undefined) { return; }

    let contents;
    try {
      contents = fs.readFileSync(options.vcapFile, 'utf8');
    }
    catch (err) {
      console.log(`error reading vcapFile '${options.vcapFile}': ${err}; ignoring`);
      return
    }

    let vcap;
    try {
      vcap = JSON.parse(contents);
    }
    catch (err) {
      console.log(`error parsing vcapFile '${options.vcapFile}': ${err}; ignoring`);
      return
    }

    options.vcap = vcap
  }

  public toJSON(): string {
    return JSON.stringify(this);
  }

  public getServices(): { [name: string]: Service } {
    let result : { [name: string]: Service } = {}

    for (const serviceName in this.services) {
      const services = this.services[serviceName];
      services.forEach((service: Service) => {
        result[service.name] = service;
      })
    }

    return result;
  }

  public getService(spec : RegExp | string) : Service | null {
    let matches: Function;
    let name: string;
    if (_.isRegExp(spec)) {
      matches = (name: string) => {
        return name.match(spec);
      };
    } else {
      matches = (name: string) => {
        return name === "" + spec;
      };
    }
    let services = this.getServices();
    for (name in services) {
      let service = services[name];
      if (matches(name)) {
        return service;
      }
    }
    return null;
}

  public getServiceURL(spec : RegExp | string, replacements?: {[key: string]: string}) : string {
    let url: string;

    if (replacements == null) {
      replacements = {};
    }

    let service = this.getService(spec);
    let credentials = service != null ? service.credentials : void 0;
    if (credentials == null) {
      return "";
    }

    replacements = _.clone(replacements);
    if (replacements.url) {
      url = credentials[replacements.url];
    } else {
      url = credentials.url || credentials.uri;
    }
    if (url == null) {
      return "";
    }
    delete replacements.url;
    if (_.isEmpty(replacements)) {
      return url;
    }

    let purl: URL.UrlWithStringQuery = URL.parse(url);
    for (let key in replacements) {
      let value = replacements[key];
      switch (key) {
        case "auth":
          let userid = value[0];
          let password = value[1];
          purl.auth = credentials[userid] + ":" + credentials[password];
          break;
        case "hash":
          purl.hash = credentials[key];
          break;
        case "host":
          purl.host = credentials[key];
          break;
        case "hostname":
          purl.hostname = credentials[key];
          break;
        case "href":
          purl.href = credentials[key];
          break;
        case "path":
          purl.path = credentials[key];
          break;
        case "pathname":
          purl.pathname = credentials[key];
          break;
        case "protocol":
          purl.protocol = credentials[key];
          break;
        case "search":
          purl.search = credentials[key];
          break;
      }
    }
    return URL.format(purl);
  }

  public getServiceCreds(spec : RegExp | string) : any {
    let service = this.getService(spec);
    if (service) {
      return service.credentials || {};
    }
    return null;
  }
}

export function getApp(appEnv: AppEnv, options: Options) : App {
  let appStr = process.env.VCAP_APPLICATION;

  if (appStr) {
    try {
      let envValue = JSON.parse(appStr);

      if (!appEnv.isLocal) {
        return envValue;
      }

      if (options.vcap && options.vcap.application) {
        return options.vcap.application;
      }
      return envValue;
    }
    catch (err) {
      throwError(`env var VCAP_APPLICATION is not JSON: ${appStr}`);
    }
  }
  return {name: "ignoreme", host: "localhost"};
}

export function getServices(appEnv: AppEnv, options: Options) : Services {
  let servicesStr = process.env.VCAP_SERVICES;

  if (servicesStr) {
    try {
      let envValue = JSON.parse(servicesStr);

      if (!appEnv.isLocal) {
        return envValue;
      }

      if (options.vcap && options.vcap.services) {
        return options.vcap.services;
      }
      return envValue;
    }
    catch (err) {
      throwError(`env var VCAP_SERVICES is not JSON: ${servicesStr}`);
    }
  }
  return {};
}

export function getPort(appEnv: AppEnv) : number {
  var portString = process.env.PORT || process.env.CF_INSTANCE_PORT || process.env.VCAP_APP_PORT;

  if (!portString) {
    if (!appEnv.name) {
      return 3000
    }
    portString = `${ports.getPort(appEnv.name)}`
  }


  let port = parseInt(portString, 10)
  if (isNaN(port)) {
    throwError(`invalid PORT value: ${portString}`)
  }

  return port;
}

export function getName(appEnv: AppEnv, options: Options) : string {
  if (options.name) {
    return options.name;
  }

  let name = appEnv.app ? appEnv.app.name : "";
  if (name) {
    return name;
  }

  if (fs.existsSync("manifest.yml")) {
    let yString = fs.readFileSync("manifest.yml", "utf8");
    let manifest = <Manifest>yaml.safeLoad(yString, {filename: "manifest.yml"})

    if (manifest.applications) {
      let app = manifest.applications[0]
      if (app.name) {
        return app.name;
      }
    }
  }

  if (fs.existsSync("package.json")) {
    let pString = fs.readFileSync("package.json", "utf8");
    try {
      let pObject : Package = JSON.parse(pString);
      return pObject.name;
    }
    catch {}
  }

  return "";
}

export function getBind(appEnv: AppEnv) : string {
  if (appEnv.app) {
    return appEnv.app.host || "localhost";
  }
  return "localhost";
}

export function getURLs(appEnv: AppEnv, options: Options) : string[] {
  return [];
}


//-------------------------------------------------------------------------------
// Copyright IBM Corp. 2014
// Copyright Patrick Mueller 2015, 2017
// Copyright Patrick Mueller, Dr Nic Williams, 2018
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//-------------------------------------------------------------------------------
