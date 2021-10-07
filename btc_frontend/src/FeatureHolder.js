/* Copyright (c) 2021-present Tomra Systems ASA */
import React, { Component } from "react";
import config from "./config/config.json";
import toastr from "toastr";
import "toastr/build/toastr.css";
import PrettyBox from "./PrettyBox";
import RunDisplay from "./RunDisplay";
import AceEditor from "react-ace";
import StepSearch from "./StepSearch";
import BlinkLed from "./components/BlinkLed";
import KillSwitch from "./components/KillSwitch";
import KibanaLink from "./components/KibanaLink"
import ParamsCard from "./components/ParamsCard";
import "ace-builds/src-noconflict/mode-gherkin";
import "ace-builds/src-noconflict/theme-github";
import "ace-builds/src-noconflict/ext-searchbox";
import "ace-builds/src-noconflict/ext-language_tools";
import Worker from "./ws.worker.js"

class FeatureHolder extends Component {
  constructor() {
    // Pass props to parent class
    super();
    // Set initial state
    this.state = {
      code: "",
      draft: false,
      featureNotFound: false,
      feature: "",
      resultText: "No results yet. Click 'Run feature'",
      commandText: "",
      commandTs: 0,
      boundSteps: [],
      stepItems: [],
      metaData: [],
      tagFilter: null,
      fileFilter: null,
      scenarioFilter: null,
      showRunnSpinner: false,
      progressPercent: 0,
      progressBar: undefined,
      progressMessage: "",
      needRerender: true,
      ready: false,
      clearSemaphore: ""
    };

    this.documentTitle = "btc - gui"
    this.editor = React.createRef();
    this.hostname = window.location.hostname;
  }

  getUrl() {
    const url_string = window.location.href;
    return new URL(url_string);
  }

  showProgressBar(data, updateInverval = 100) {
    let progress = 10;
    this.setState({ progressPercent: progress });
    const bar = setInterval(() => {
      if (progress < 99) {
        progress += 1;
      }

      this.setState({ progressPercent: progress, progressMessage: data });
    }, updateInverval);

    this.setState({ progressBar: bar });
  }

  hideProgressBar(data) {
    clearInterval(this.state.progressBar);
    this.setState({
      progressPercent: 0,
      progressMessage: data,
      progressBar: undefined
    });
  }

  bindSteps(feature, scope) {
    return new Promise((resolve, reject) => {
      fetch(`http://${scope.hostname}:8081/steps?feature=${feature}`, {
        mode: "cors",
        method: "GET"
      }).then(x => {
        x.json().then(j => {
          if (j.filter) { //Array
            toastr.error(j[0], "Catastrophic parsing error crashing all of BTC!", {
              closeButton: true,
              extendedTimeOut: 0,
              timeOut: 0,
              tapToDismiss: false
            });
            resolve();
          } else {
            scope.setState({ metaData: j.steps });
            scope.setState({ boundSteps: j.codeSnippets });
            if (j.codeSnippets &&
              j.codeSnippets.filter(
                step => step.fileName.indexOf("NOT_FOUND.py") > -1
              ).length > 0
            ) {
              toastr.error("See step details", "Unbound test steps!");
              this.hideProgressBar(null);
              resolve();
            }
            resolve();
          }
        });
      });
    });
  }

  componentDidMount() {
    const outerScope = this;
    this.blinker = React.createRef();
    const url = this.getUrl();
    const feature = url.searchParams.get("feature");
    console.log("location: " + feature);
    this.setState({ feature: feature });

    this.showProgressBar("Loading feature step implementations", 100);

    fetch(`http://${this.hostname}:8081/${feature}`, { mode: "cors" }).then(
      x => {
        x.text().then(t => {
          if (t.indexOf("Cannot GET") > -1) {
            toastr.error(`Could not find: ${feature}`, "Feature missing!");
            this.setState({ featureNotFound: true });
          } else {
            this.setState({ code: t });
          }
        });
      }
    );

    this.bindSteps(feature, this).then(() => {
      outerScope.setState({ ready: true });
      outerScope.hideProgressBar(null);
    });

    this.worker = new Worker();
    this.worker.postMessage({ type: "doinit", hostname: this.hostname });
    this.worker.onmessage = (e) => {
      const job = e.data
      switch (job.type) {
        case "log":
          console.log(job.msg);
          break;
        case "toastr":
          toastr.error(job.warning.header, job.warning.msg);
          break;
        case "progress":
          if (job.show) {
            if (!this.state.progressBar) {
              this.showProgressBar(job.msg, job.duration);
            }
          } else {
            if (this.state.progressBar) {
              this.hideProgressBar("");
            }
          }
          break;
        case "commandText":
          this.setState({ commandText: job.data, commandTs: Date.now()});
          if (this.state.showRunnSpinner) {
            this.blinker.current.blink();
          }
          break;
        case "resultText":
          this.setState({ resultText: this.state.resultText + job.data });
          break;
        case "finished":
          this.setState({ showRunnSpinner: false });
          document.title = `${this.documentTitle} ☒ Done!`;
          this.hideProgressBar("");
          break;
        default:
          break
      }
    }

    const stepCompleter = {
      getCompletions: (editor, session, pos, prefix, callback) => {
        if (prefix.length === 0) {
          callback(null, []);
          return;
        }
        const stepList = outerScope.getFilteredData();
        callback(
          null,
          stepList.map(function (ea) {
            return { name: ea.value, value: ea.value };
          })
        );
      }
    };

    this.editor.current.editor.completers = [stepCompleter];
  }
  runCodeSocket() {
    const url = this.getUrl();
    const target = url.searchParams.get("target");
    const sw = url.searchParams.get("sw");
    if (config.requireTarget && !target) {
      toastr.error("No parameter 'target' supplied", "Missing URL parameter!");
      return;
    }

    if (window.btc_sspi && !window.btc_user) {
      toastr.error(
        "You are not allowed to run tests when we don't know who you are!",
        "User login required"
      );
      return;
    }

    if (this.state.showRunnSpinner) {
      toastr.error(
        "You already have a running test!",
        "Don't be so pushy"
      );
      return;
    }

    this.clearDisplay();
    document.title = `${this.documentTitle}  ▶ Running...`;
    this.setState({ commandText: "Initializing...", commandTs: Date.now(), resultText: "", showRunnSpinner: true });
    this.worker.postMessage({ type: "run", feature: this.state.feature, target: target, user: window.btc_user ? window.btc_user : "", sw: sw ? sw : "" });
  }

  killRunningTest() {
    const outerScope = this;
    toastr.warning(
      "<br /><button type='button' value='yes' class='btn btn-primary btn-sm'>Yes</button><button type='button' value='no' class='btn btn-secondary btn-sm'>No</button>",
      "Are you sure you want to stop this test run?",
      {
        closeButton: true,
        allowHtml: true,
        onclick: function (toast) {
          const value = toast.target.value;
          if (value === "yes") {
            outerScope.worker.postMessage({ type: "kill" });
            outerScope.setState({ showRunnSpinner: false });
          }
          toastr.remove();
        }
      }
    );
  }

  sortClx(clx, sortProp) {
    return clx.sort((a, b) =>
      a[sortProp] > b[sortProp] ? 1 : b[sortProp] > a[sortProp] ? -1 : 0
    );
  }

  getDataEl(expr) {
    const list = this.state.metaData.map(data => {
      return data[expr];
    });

    const notNullValues = list.filter(item => {
      return item !== null && item;
    });

    const distinctValues = [...new Set(notNullValues)];
    const elvalues = distinctValues.map(item => {
      return { value: item, label: item };
    });

    return this.sortClx(elvalues, "value");
  }

  getFilteredData() {
    let dropdownValues = [];

    let filteredSet = this.state.metaData;

    if (this.state.fileFilter) {
      filteredSet = filteredSet.filter(item => {
        return item.file === this.state.fileFilter;
      });
    }

    if (this.state.scenarioFilter) {
      filteredSet = filteredSet.filter(item => {
        return item.scenario === this.state.scenarioFilter;
      });
    }

    if (this.state.tagFilter) {
      filteredSet = filteredSet.filter(item => {
        return item.tag === this.state.tagFilter;
      });
    }

    filteredSet.forEach(element => {
      dropdownValues = dropdownValues.concat(element.steps);
    });

    const distinctValues = [...new Set(dropdownValues)];

    const returnValues = [];
    distinctValues.forEach(value => {
      const itemParent = filteredSet.filter(item => {
        return item.steps.indexOf(value) > -1;
      });

      if (itemParent.length > 0) {
        for (var i = 0; i < itemParent.length; i++) {
          let origin = "";
          if (itemParent[i].tag) {
            origin += `@${itemParent[i].tag}, `;
          }
          origin += `${itemParent[i].file}, "${itemParent[i].scenario}"`;
          returnValues.push({
            key: `${value}_${i}`,
            value: value,
            origin: origin,
            file: itemParent[i].file
          });
        }
      }
    });

    return this.sortClx(returnValues, "key");
  }

  clearDisplay() {
    document.title = this.documentTitle;
    this.hideProgressBar(null);
    this.setState({
      clearSemaphore: `clear_${Math.random()}`,
      resultText: "No results yet. Click 'Run feature'"
    });
  }
  onChange(newValue) {
    this.setState({ draft: true, code: newValue });
  }

  saveFeature() {
    if (window.btc_sspi && !window.btc_user) {
      toastr.error(
        "You are not allowed to edit features when we don't know who you are!",
        "User login required"
      );
      return;
    }
    this.showProgressBar("Reloading feature step implementations");
    const outerScope = this;
    fetch(`http://${this.hostname}:8081/edit?feature=${this.state.feature}`, {
      mode: "cors",
      method: "POST",
      body: this.state.code
    }).then(() => {
      this.setState({ draft: false });
      this.bindSteps(this.state.feature, outerScope).then(() => {
        this.setState({ needRerender: true })
        this.hideProgressBar(null);
      });
    });
  }

  createFeature() {
    fetch(`http://${this.hostname}:8081/touch?feature=${this.state.feature}`, {
      mode: "cors",
      method: "POST"
    }).then(x => {
      x.text().then(t => {
        this.setState({ featureNotFound: false });
        this.setState({ code: t });
      });
    });
  }

  fileFilterChanged(event) {
    this.setFilterValue("fileFilter", event.target.value);
  }

  tagFilterChanged(event) {
    this.setFilterValue("tagFilter", event.target.value);
  }

  scenarioFilterChanged(event) {
    this.setFilterValue("scenarioFilter", event.target.value);
  }

  setFilterValue(filter, newValue) {
    let obj = {};

    if (newValue === "All") {
      obj[filter] = null;
    } else {
      obj[filter] = newValue;
    }
    this.setState(obj);
  }

  render() {
    let steps;
    if (this.state.boundSteps && this.state.boundSteps.length > 0) {
      let count = 0;
      steps = this.state.boundSteps.map(step => {
        return (
          <PrettyBox
            code={step.content}
            fileName={step.fileName}
            key={count++}
          />
        );
      });

      if (this.state.needRerender) {
        setTimeout(() => {
          this.hideProgressBar();
        }, 500);
      }
    }

    return (
      <div>
        <div id="codeDiv" style={{ display: "none" }}>
          {this.state.code}
        </div>
        <StepSearch
          items={this.getFilteredData()}
          fileFilterOptions={this.getDataEl("file")}
          tagFilterOptions={this.getDataEl("tag")}
          scenarioFilterOptions={this.getDataEl("scenario")}
          tagFilterChanged={this.tagFilterChanged.bind(this)}
          fileFilterChanged={this.fileFilterChanged.bind(this)}
          scenarioFilterChanged={this.scenarioFilterChanged.bind(this)}
        />
        <div className="container-fluid">
          <div className="row">
            <div className="col-8">
              <AceEditor
                ref={this.editor}
                mode="gherkin"
                theme="github"
                name="codeDiv"
                width="1200px"
                maxLines={Infinity}
                onChange={this.onChange.bind(this)}
                value={this.state.code}
                editorProps={{ $blockScrolling: Infinity }}
                setOptions={{
                  enableBasicAutocompletion: true
                }}
              />
            </div>
            <div className="col-2">
              <ParamsCard />
            </div>
          </div>
        </div>
        <RunDisplay
          ready={this.state.ready}
          hasChanges={this.state.draft}
          featureNotFound={this.state.featureNotFound}
          saveFeature={this.saveFeature.bind(this)}
          createFeature={this.createFeature.bind(this)}
          runFeature={this.runCodeSocket.bind(this)}
          resultText={this.state.resultText}
          commandText={this.state.commandText}
          commandTs={this.state.commandTs}
          clearRun={this.clearDisplay.bind(this)}
          showRunnSpinner={this.state.showRunnSpinner}
          progressPercent={this.state.progressPercent}
          progressMessage={this.state.progressMessage}
          BlinkLed={
            this.state.showRunnSpinner && (
              <BlinkLed ref={this.blinker}></BlinkLed>
            )
          }
          KibanaLink={<KibanaLink featureName={this.state.feature}></KibanaLink>}
          KillSwitch={
            this.state.showRunnSpinner && (
              <KillSwitch
                clickHandler={this.killRunningTest.bind(this)}
              ></KillSwitch>
            )
          }
          hostName={this.hostname}
          clearSemaphore={this.state.clearSemaphore}
        ></RunDisplay>
        <div>{steps}</div>
      </div>
    );
  }
}

export default FeatureHolder;
