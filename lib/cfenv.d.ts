export interface Options {
    vcapFile: string;
    vcap: VCAP;
    name: string;
}
export declare type Services = {
    [serviceName: string]: Service[];
};
export interface VCAP {
    application: App;
    services: Services;
}
export interface Service {
    name: string;
    credentials: {
        [k: string]: string;
    };
}
export interface App {
    name: string;
    host: string;
}
export declare function getAppEnv(options: Options): AppEnv;
export declare class AppEnv {
    isLocal: boolean;
    app: App;
    services: Services;
    name: string;
    port: number;
    bind: string;
    urls: string[];
    url: string;
    constructor(options: Options);
    private getVcapFromFile;
    toJSON(): string;
    getServices(): {
        [name: string]: Service;
    };
    getService(spec: RegExp | string): Service | null;
    getServiceURL(spec: RegExp | string, replacements?: {
        [key: string]: string;
    }): string;
    getServiceCreds(spec: RegExp | string): any;
}
export declare function getApp(appEnv: AppEnv, options: Options): App;
export declare function getServices(appEnv: AppEnv, options: Options): Services;
export declare function getPort(appEnv: AppEnv): number;
export declare function getName(appEnv: AppEnv, options: Options): string;
export declare function getBind(appEnv: AppEnv): string;
export declare function getURLs(appEnv: AppEnv, options: Options): string[];
