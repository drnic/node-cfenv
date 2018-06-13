import * as http from "http";
// import * as cfenv from "..";
import * as cfenv from "./cfenv";

function main() {
  let appEnv = cfenv.getAppEnv();

  let dump = generateDump(appEnv);

  let server = http.createServer();

  server.on("request", (_, response: http.ServerResponse) => {
    response.writeHead(200,
      {"Content-Type": "text/plain"})

    response.end(dump);
  });

  server.listen(appEnv.port, appEnv.bind, () => {
    console.log(`server starting on ${appEnv.url}`);
  });
}


function generateDump(appEnv: cfenv.AppEnv) : string {
  let result : string[] = [];

  console.log(appEnv);
  result.push(`cfenv.getAppEnv(): ${JL(appEnv)}`);

  let services = appEnv.getServices()
  console.log(services);
  result.push(`appEnv.getServices(): ${JL(services)}`);

  let serviceURL = appEnv.getServiceURL("cf-env-test", {
    pathname: "database",
    auth:     ["username", "password"]
  });

  result.push(`appEnv.getServiceURL(): ${serviceURL}`)

  appEnv.toJSON()
  return result.join("\n\n");
}

let JL = (object: any) => { return JSON.stringify(object, null, 4); }

if (require.main === module) {
  main();
}