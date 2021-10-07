/* Copyright (c) 2021-present Tomra Systems ASA */
import React from "react";
import config from "../config/config.json"


String.prototype.interpolate = function(params) {
  const names = Object.keys(params);
  const vals = Object.values(params);
  return new Function(...names, `return \`${this}\`;`)(...vals);
}

const KibanaLink = ({ featureName }) => {
    if (featureName) {
        const escapedFeatureName = featureName.replace(/\//g, "%2F");
        const url = config.kibanaUrl.interpolate({ escapedFeatureName: escapedFeatureName});
        return (<a target="_blank" rel="noopener noreferrer" href={url} title="See results in Kibana">
            <span role="img" aria-label="kibana">&#128279;</span></a>)
    } else {
        return (<></>)
    }

}

export default KibanaLink;