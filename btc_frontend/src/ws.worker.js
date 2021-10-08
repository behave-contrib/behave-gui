/* Copyright (c) 2021-present Tomra Systems ASA */
import io from "socket.io-client";
import config from "./config/config.json"

const randomId = () => Math.random().toString(36).substr(2, 5);

let host;
let socket = null;
let user = null;
let progressBar;
let re = undefined;

const hasMatches = (input) => {
  if(re && re.test(input)){
    return true;
  }
  return false;
}

const init = () => {
  if(config.showProgressBarRegex){
    re = new RegExp(config.showProgressBarRegex);
  }
  socket.on("connect", () => {
    postMessage({ type: "log", msg: "Connected to script server..." });
  });

  socket.on("errormsg", errMsg => {
    postMessage({ type: "toastr", warning: { header: "Scenario Error", msg: errMsg.traceback } });
  });

  socket.on("reconnect_attempt", (attempt) => {
    postMessage({ type: "log", msg: `Reconnect - attempt count:${attempt}` });
  });

  socket.on("event", datas => {
    const stepRegex = /(^@^Feature|\d* feature|Scenario|\d* scenarios^Feature|\d* feature|Scenario|\d* scenarios|^Summary|^\s{4,8}(\||\+)|Failing|^As|Given|And\s|Or\s|When|Then|\d* steps|Took|^I\s|\d{1,5}\|).*/gm;
    for (let i = 0; i < datas.length; i++) {
      let data = datas[i];

      postMessage({ type: "commandText", data: data + "\n" });

      if (data.match(stepRegex) !== null) {
        postMessage({ type: "resultText", data: data + "\n" });
      }

      if (data.startsWith("Took")) {
        postMessage({ type: "finished" });
      }

      if (!progressBar && hasMatches(data)) {
        progressBar = true
        postMessage({ type: "progress", show: true });
      }

      if (progressBar && !hasMatches(data)) {
        progressBar = false
        postMessage({ type: "progress", show: false });
      }
    }
  });

  socket.on("error", function (errobj) {
    const msg = "Connection lost! Reconnecting";
    postMessage({ type: "toastr", warning: { header: "Scenario server connection", msg: msg } });
    postMessage({ type: "log", msg: `Error occurred: ${errobj}` });
    socket = io.connect(host);
  });
}

onmessage = (e) => {
  if (!e.data.type) {
    return;
  }
  if (socket == null && e.data.type === "doinit") {

    host = `http://${e.data.hostname}:8081`;
    user = randomId()
    socket = io(host, { query: { token: user } });
    init();
  }
  if (e.data.type === "run") {
    socket.emit("run", {
      feature: e.data.feature,
      target: e.data.target,
      user: e.data.user,
      sw: e.data.sw
    });
  }

  if (e.data.type === "kill") {
    socket.emit("kill");
  }
}  
