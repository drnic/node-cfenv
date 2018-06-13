"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
var http = __importStar(require("http"));
// import * as cfenv from "..";
var cfenv = __importStar(require("./cfenv"));
function main() {
    var appEnv = cfenv.getAppEnv();
    var dump = generateDump(appEnv);
    var server = http.createServer();
    server.on("request", function (_, response) {
        response.writeHead(200, { "Content-Type": "text/plain" });
        response.end(dump);
    });
    server.listen(appEnv.port, appEnv.bind, function () {
        console.log("server starting on " + appEnv.url);
    });
}
function generateDump(appEnv) {
    var result = [];
    console.log(appEnv);
    result.push("cfenv.getAppEnv(): " + JL(appEnv));
    var services = appEnv.getServices();
    console.log(services);
    result.push("appEnv.getServices(): " + JL(services));
    var serviceURL = appEnv.getServiceURL("cf-env-test", {
        pathname: "database",
        auth: ["username", "password"]
    });
    result.push("appEnv.getServiceURL(): " + serviceURL);
    appEnv.toJSON();
    return result.join("\n\n");
}
var JL = function (object) { return JSON.stringify(object, null, 4); };
if (require.main === module) {
    main();
}
