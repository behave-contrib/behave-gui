/* Copyright (c) 2021-present Tomra Systems ASA */
const {PythonShell} = require("python-shell");
const config = require("config");
const path = require("path");


const runFeaturesPath = path.join(__dirname, "..", "runFeatures.py");
const getOptions = (feature, flag, target, user, sw, testSetId) => {
  const targetconfig =`target=${target}`;
  const userName = `user=${user}`;
  const swName = `sw=${sw}`;
  const testSetIdVal = `testSetId=${testSetId}`;
  const argsList = [];

  if(flag) {
    argsList.push(feature, `-${flag}`)
  } else {
    argsList.push(feature);
  }

  argsList.push("-D", targetconfig);
  if(user) {
    argsList.push("-D", userName);
  }

  if(sw){
    argsList.push("-D", swName);
  }

  if(testSetId){
    argsList.push("-D", testSetIdVal);
  }

  return {
    pythonPath: config.get("Server.pythonPath"),
    pythonOptions: ["-u"], // get print results in real-time
    args: argsList
  };
}

const correctFeatureName = (feature) => {
  if(feature.startsWith("/") || feature.startsWith("\\") ){
    feature = feature.substring(1);
  }
  return feature;
}

const runWithCallback = (feature, flag, target, user, sw, callback, endCallback, testSetId=0, userdata=null) => {
  const options = getOptions(correctFeatureName(feature), flag, target, user, sw, testSetId);
  for(idx in userdata){
    options.args.push("-D", userdata[idx])
  }

  const shell = new PythonShell(runFeaturesPath, options);
  shell.on("message", function (message) {
    callback(message);
  });

  shell.on("stderr", function (stderr) {
    console.log(`[${new Date()}]: Script-level stderr: ${stderr}`);
  });

  shell.on("error", function (error) {
    console.log(`[${new Date()}]: Script-level error: ${error}`);
  });

  // end the input stream and allow the process to exit
  shell.end(function (err, code, signal) {
        if (err){
            console.log(`Exception: ${err}`);
        }
        endCallback(err, code, signal, {target: target, feature: feature});
    });

  return shell;
}

const runScript =  (target, feature, flag) =>{

  const options = getOptions(correctFeatureName(feature), flag, target);

  const promise = new Promise(function(resolve){
    
    PythonShell.run(runFeaturesPath, options, function (err, results) {
      if (err){
        console.error(err);
        resolve(err);
        return;
      }
    
      responseObj = {testDefs: results, unboundStep: false}

      if(results.filter(res => res.indexOf("0 undefined") !== -1).length === 0){
        responseObj.unboundStep = true;
      }
      resolve(responseObj);
    });
  });

  
  return promise;
};

const getStepDefs = (feature=null) => {
  let stepargs;
  if (feature){
    stepargs = [correctFeatureName(feature), "--f=json", "--dry-run", "--no-summary", "--no-snippets"];
  } else {
    stepargs = ["--f=json", "--dry-run", "--no-summary", "--no-snippets"];
  }
  let options = {
    pythonPath: config.get("Server.pythonPath"),
    args: stepargs
  };
  var promise = new Promise(function(resolve, reject){
    PythonShell.run(runFeaturesPath, options, function (err, results) {
      if (err){
        reject(err);
      }else{
        resolve(results);
      }
    });
  });

  return promise;
};

module.exports = {
  runScript: runScript,
  runWithCallback: runWithCallback,
  getStepDefs: getStepDefs
};
