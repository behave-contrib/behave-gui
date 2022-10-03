/* Copyright (c) 2021-present Tomra Systems ASA */
const config = require("config");
if(config.Server.extensionPackage){
  btcExtension = require(config.Server.extensionPackage).init();
  btcExtension.registerStartupServices();
}
const loggingFacility = require("./js/loggingFacility");
const log = loggingFacility.createLogger();
const NodeCache = require("node-cache");
const stepCache = new NodeCache({ stdTTL: 0 }); //Unlimited
const allsteps = "allsteps";
const express = require("express");
const pythonRunner = require("./js/pythonRunner");
const app = express();
const http = require("http");
const cors = require("cors");
const responseProcessor = require("./js/responseProcessor");
const fs = require("fs");
const assets = require("./js/assets");
const os = require("os");
const Rx = require("rxjs");
const RxOps = require("rxjs/operators");
const path = require("path");

if (config.Server.useSspi) {
  const nodeSSPI = require("node-sspi");
  app.use("/identify", (req, res, next) => {
    var nodeSSPIObj = new nodeSSPI({
      retrieveGroups: false
    });
    nodeSSPIObj.authenticate(req, res, () => {
      res.writableEnded || next();
    });
  });
  app.use("/identify", function (req, res) {
    res.setHeader("Content-Type", "application/javascript");
    res.send(
      `window.btc_user = "${req.socket.user.replace("\\", "\\\\")}";`
    );
  });
}

app.use(cors());
app.use(express.static("./"));

if(config.Server.frontEndPath){
    app.use(express.static(config.Server.frontEndPath));
}

if(config.Server.extensionPackage){
  btcExtension.registerAppServices(app)
}


const getFeaturePath = (feature) => {
  return path.join(__dirname, feature);
}

app.post("/touch", (request, respond) => {
  const feature = request.query.feature;
  const fullFileName = getFeaturePath(feature);
  featureText = assets.geDefaultFeatureText();
  fs.writeFile(fullFileName, featureText, "utf8", () => {
    respond.status(200).send(featureText);
  });
});

app.post("/edit", (request, respond) => {
  const feature = request.query.feature;
  let featureText = "";
  const dateStamp = Math.floor(new Date() / 1000);

  request.on("data", data => {
    featureText += data.toString();
  });

  request.on("end", () => {
    const fullFileName = getFeaturePath(feature)
    fs.copyFileSync(fullFileName, getFeaturePath(`${feature}.${dateStamp}`));
    console.log(`${feature} backed up to ${feature}.${dateStamp}`);
    log.trace(`${feature} backed up to ${feature}.${dateStamp}`);
    fs.writeFile(fullFileName, featureText, "utf8", () => {
      respond.status(204).send();
      return;
    });
  });
});

app.post("/clearcache", (request, respond) => {
  stepCache.del(allsteps);
  respond.status(204).send();
});

app.get("/steps", (request, respond) => {
  let stepDefs = stepCache.get(allsteps);
  let codeElements;
  let cacheMiss = false;
  let jsonStepDefs;
  if (stepDefs == undefined){
      // handle miss!
      cacheMiss = true;
      log.warn("Cache miss")
      codeElements = pythonRunner.getStepDefs();
  } else {
    codeElements = Promise.resolve(stepDefs);
  }
  codeElements.then(res => {
    if (cacheMiss) {
      const concatRes = res.join("\n");
      if(concatRes.startsWith("ParserError")) {
        respond.status(500).send(res);
        return;
      }
      //Process and cache response
      const jsonObj = responseProcessor.getNormalizedJson(concatRes);
      jsonStepDefs = responseProcessor.getStepDefsFromJson(jsonObj);
      stepCache.set(allsteps, jsonStepDefs);
    } else {
      jsonStepDefs = res;
    }
    try {
      localSteps = pythonRunner.getStepDefs(feature=request.query.feature);
      localSteps.then(resolv => {
        const localConcatRes = resolv.join("\n");
        localJsonObj = responseProcessor.getNormalizedJson(localConcatRes);
        const snippets = responseProcessor.getSelectedFeatureJson(localJsonObj, request.query.feature);
        respond.status(200).send({ steps: jsonStepDefs, codeSnippets: snippets });
      }, reject => {
        respond.status(500).send(reject);
      });
    } catch (error) {
      errPreMsg = "Call to responseProcessor.getNormalizedJson() failed. No stdout should be produced when py modules load! See next exception for details.";
      console.error(errPreMsg);
      console.error(error);
      log.error(errPreMsg);
      log.error(error);
      respond.status(500).send(errPreMsg);
    }
  },
    rej => {
      const errMsg = `Python error: getStepDefs() failed. ${rej}. ${rej.traceback}`;
      console.error(errMsg);
      log.error(errMsg);
    }
  );
});

app.post("/run", (request, respond) => {
  const feature = request.query.feature;
  const target = request.query.target;
  pythonRunner.runScript(target, feature, false);
  respond.sendStatus(200);
});

const server = http.createServer(app);
server.listen(8081);
server.on("listening", () => {
  console.log(
    "Script server started on port %s at %s",
    server.address().port,
    os.hostname().toLowerCase()
  );
  log.trace(
    "Script server started on port %s at %s",
    server.address().port,
    os.hostname().toLowerCase()
  );
});

const io = require("socket.io")(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

//See: https://github.com/aslamanver/io-session-handler
const session_handler = require("io-session-handler").from(io, { timeout: 5000 });
session_handler.connectionListener((connection) => {
  console.log(connection);
});

io.on("connection", socket => {
  const regex = /^Took\s\d{1,}m/gm;
  let shell;
  const endRoutine = (err, code, signal, runCmd = null) => {
    const endMsg = `Test ended. Error: ${err}. Exit code: ${code}. Signal: ${signal}. \nTerminating shell process`;
    console.log(endMsg);
    log.trace(endMsg);

    if (code && socket) {
      const errMsg = `Irrecoverable Error: ${err && err.message}`;
      socket.emit("errormsg", errMsg);
      log.error(errMsg);
    }

    if (shell) {
      shell.childProcess.kill();
      shell.terminate();
      delete shell;
    }

  };
  console.log(
    `[${new Date()}]: User ${socket.id}@${socket.conn.remoteAddress
    } connected...`
  );
  log.trace(`User ${socket.id}@${socket.conn.remoteAddress
    } connected...`
  );
  socket.on("run", runCmd => {
    log.trace(`Feature started with arguments: ${JSON.stringify(runCmd)}`);
    const testSetId = runCmd.testSetId || 0;
    const bufferInterval = 200;
    const input$ = new Rx.Subject();
    let pipe 
    if (config.Server.skipMessagesStartingWith) {
      pipe = input$.pipe(
        RxOps.filter(msg => !config.Server.skipMessagesStartingWith.some(expr => msg.startsWith(expr))),
        RxOps.bufferTime(Rx.interval(bufferInterval)));
    } else {
      pipe = input$.pipe(RxOps.bufferTime(Rx.interval(bufferInterval)));
    }
    pipe.subscribe(msgs => {
      if (msgs.length > 0) {
        socket.emit("event", msgs);
      }
    });
    try {
        shell = pythonRunner.runWithCallback(
        runCmd.feature,
        null,
        runCmd.target,
        runCmd.user,
        runCmd.sw,
        message => {
          input$.next(message);
          if (regex.exec(message) !== null) {
            setTimeout(() => {
              shell.end(() => {
                const endMsg = "Got finished message from console, closing stdin stream"
                console.log(endMsg)
                log.trace(endMsg)
              }
              );
              endRoutine(null, null, null, runCmd);
            }, 500);
          }
        },
        endRoutine,
        testSetId,
        runCmd.D
      );
    } catch (exception) {
      console.log(`[${new Date()}]: Socket-level exception: ${exception}`);
      log.error(`Socket-level exception: ${exception}`);
    }
  });

  socket.on("kill", () => {
    setTimeout(() => {
      if (shell) {
        shell.end(() => {
          const killMsg = "Got kill signal from client, killing process";
          console.log(killMsg);
          log.trace(killMsg);
        }
        );
      }
      endRoutine();
    }, 500);
  });

  socket.on("disconnect", () => {
    console.log(
      `[${new Date()}]: User ${socket.id}@${socket.conn.remoteAddress
      } disconnected...`
    );
    log.trace(`User ${socket.id}@${socket.conn.remoteAddress
      } disconnected...`);
  });
});
