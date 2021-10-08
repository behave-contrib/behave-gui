/* Copyright (c) 2021-present Tomra Systems ASA */
const loggingFacility = require("./loggingFacility");
const log = loggingFacility.createLogger();
const lineByLine = require("n-readlines");
const pythonIndenter = require("./pythonIndenter");

const getNormalizedJson = (jsonData) => {
    badCommaRegex = /,\n*]/gm;

    if (jsonData.match(badCommaRegex)) {
        jsonData = jsonData.replace(badCommaRegex, "]");
    }
    let json = "";
    try {
        json = JSON.parse(jsonData);
    } catch (error) {
        log.error(`Failed to parse json: ${error}`);
        json = JSON.parse('{"filter": 0}');
    }
    return json;
};

const getStepDefsFromJson = (jsonObj) => {
    const snippets = [];
    if (!jsonObj || !jsonObj.forEach)
        return;
    jsonObj.forEach((feature) => {
        feature.elements.forEach((element) => {
            const multiScenario = element.name.indexOf("-- @") > -1;
            let currentRecord = {
                feature: feature.name,
                file: feature.location.trim().split(":")[0],
                scenario: multiScenario == false ? element.name : element.name.substring(0, element.name.indexOf("-- @")).trim(),
                tag: feature.tags.length > 0 ? feature.tags[0] : null,
                steps: []
            };

            snippets.push(currentRecord);

            element.steps.forEach((step) => {
                let currentStep = `${step.keyword} ${step.name}`;
                const isSubstep = currentStep.indexOf("-- @") > -1;

                if (isSubstep) {
                    currentStep = currentStep.substring(0, step.indexOf("-- @"));
                }

                if (currentRecord.steps.indexOf(currentStep) === -1) {
                    currentRecord.steps.push(currentStep);
                }
            });
        });
    });

    return snippets;
};

const getCodeSnippets = (fileReferences) => {
    const snippets = [];

    for (let ref of fileReferences) {
        const fileAndLine = ref.split(":");
        const currentFile = fileAndLine[0];
        const liner = new lineByLine(currentFile);

        let line;
        let lineNumber = 0;
        let shouldContinue = true;
        let currentFileContent = "";
        let lineContent = "";

        while (line = liner.next()) {
            if (shouldContinue) {
                lineNumber++;
                if (lineNumber >= fileAndLine[1]) {

                    lineContent = line.toString("utf-8").trimEnd();

                    if (lineContent == "") {
                        snippets.push({ fileName: `#${ref}`, content: currentFileContent });
                        currentFileContent = "";
                        shouldContinue = false;
                    }
                    currentFileContent += pythonIndenter.getIndentedLine(lineContent);
                }
            }
        }

        //Store last snippet if file has ended
        if (currentFileContent.trim()) {
            snippets.push({ fileName: `#${ref}`, content: currentFileContent });
        }
    }

    return snippets;
};

const getSelectedFeatureJson = (jsonData, feature) => {
    if (feature.startsWith("/")) {
        feature = feature.substring(1);
    }
    if(!jsonData || !Array.isArray(jsonData)){
        return;
    }
    selectedFeature = jsonData.filter(f => f.location.indexOf(feature) > -1);
    const bindResp = getBindResponse(selectedFeature)
    const distinctRefs = [...new Set(bindResp.refs)];
    const snippets = getCodeSnippets(distinctRefs);
    bindResp.unbound.forEach((unbound) => {
        snippets.unshift({
            fileName: "# NOT_FOUND.py",
            content: `# Error in scenario \"${unbound.scenario}\" somewhere near:\n@${unbound.keyword}(u'${unbound.name}')\ndef step_impl(context):\n\traise NotImplementedError(u'Step not implemented')\n`
        });
    });
    return snippets;
};

const getBindResponse = (jsonObj) => {
    const refs = [];
    const unbound = [];
    jsonObj.forEach((feature) => {
        feature.elements.filter(f => f.type != "background").forEach((element) => {
            element.steps.forEach((step) => {
                if (!step.match) {
                    unbound.push({ "keyword": step.keyword, "name": step.name, "scenario": element.name });
                } else {
                    refs.push(step.match.location);
                }
            });
        });
    });
    return { refs: refs, unbound: unbound };
};

module.exports = {
    getCodeSnippets: getCodeSnippets,
    getStepDefsFromJson: getStepDefsFromJson,
    getBindResponse: getBindResponse,
    getSelectedFeatureJson: getSelectedFeatureJson,
    getNormalizedJson: getNormalizedJson
};
