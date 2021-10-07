/* Copyright (c) 2021-present Tomra Systems ASA */
import React, { useState } from "react";
import RunTerminal from "./RunTerminal";
import ReservedTargets from "./components/ReservedTargets";
import "react-tabs/style/react-tabs.css";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import ProgressBar from "react-bootstrap/ProgressBar";
import config from "./config/config.json"

const RunDisplay = ({
  ready,
  hasChanges,
  featureNotFound,
  saveFeature,
  resultText,
  createFeature,
  commandText,
  commandTs,
  runFeature,
  clearRun,
  showRunnSpinner,
  progressPercent,
  progressMessage,
  BlinkLed,
  KibanaLink,
  KillSwitch,
  hostName,
  clearSemaphore
}) => {
  const [tabIndex, setTabIndex] = useState(0);
  let saveButton;
  let createButton;
  if (hasChanges) {
    saveButton = (
      <button
        className="btn btn-primary btn-sm"
        onClick={saveFeature}
        style={{ backgroundColor: "lightcoral" }}
      >
        Save feature
      </button>
    );
  }
  if (featureNotFound) {
    createButton = (
      <button
        className="btn btn-primary btn-sm"
        onClick={createFeature}
        style={{ backgroundColor: "lightcoral" }}
      >
        Create feature
      </button>
    );
  }

  return (
    <div>
      <div>
        {createButton}
        {saveButton}
        <button
          className="btn btn-primary btn-sm"
          disabled={!ready}
          onClick={runFeature}
        >
          Run feature
        </button>
        <button className="btn btn-secondary btn-sm" onClick={clearRun}>
          Clear
        </button>
        &nbsp;{BlinkLed}&nbsp;{KillSwitch}&nbsp;{config.kibanaUrl && (KibanaLink)}
      </div>
      <div>
        <Tabs selectedIndex={tabIndex} onSelect={newTabIndex => setTabIndex(newTabIndex)} forceRenderTabPanel={true}>
          <TabList>
            <Tab>Results</Tab>
            <Tab>Console log&nbsp;<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" tabIndex="0" focusable="true" role="img" aria-label="Info">
              <title>Use 'Ctrl + Arrow up' / 'Ctrl + Arrow down' to toggle autoscroll when 'Console log' tab selected.</title>
              <path fill="#007bff" d="M8 14A6 6 0 118 2a6 6 0 010 12zm0-1A5 5 0 108 3a5 5 0 000 10zm-.186-1.065A.785.785 0 017 11.12c0-.48.34-.82.814-.82.475 0 .809.34.809.82 0 .475-.334.815-.809.815zM5.9 6.317C5.96 5.168 6.755 4.4 8.048 4.4c1.218 0 2.091.759 2.091 1.8 0 .736-.36 1.304-1.03 1.707-.56.33-.717.56-.717 1.022v.305l-.1.1H7.47l-.1-.1v-.431c-.005-.646.302-1.104.987-1.514.527-.322.708-.59.708-1.047 0-.536-.416-.91-1.05-.91-.652 0-1.064.374-1.112.998l-.1.092H6l-.1-.105z"></path></svg>
            </Tab>
            {config.checkMachineAvailable && (<Tab>Reserved</Tab>)}
          </TabList>
          <TabPanel>
            <pre>{resultText}</pre>
            {progressPercent > 0 && (
              <div style={{ width: "20%", marginBottom: 4 }}>
                <pre>{progressMessage}</pre>
                <ProgressBar
                  now={progressPercent}
                  label={`${progressPercent} %`}
                />
              </div>
            )}
            {showRunnSpinner && (
              <div
                style={{ marginBottom: 4 }}
                className="spinner-border text-primary"
                role="status"
              >
                <span className="sr-only">Loading...</span>
              </div>
            )}
          </TabPanel>
          <TabPanel>
            <RunTerminal commandText={commandText} commandTs={commandTs} run={tabIndex === 1} clearSemaphore={clearSemaphore} />
          </TabPanel>
          {config.checkMachineAvailable && (<TabPanel>
            <ReservedTargets hostName={hostName} run={tabIndex === 2} />
          </TabPanel>)}
        </Tabs>
      </div>
    </div>
  );
};

export default RunDisplay;
