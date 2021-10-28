/* Copyright (c) 2021-present Tomra Systems ASA */
import React, { Component, PureComponent } from "react";

class Command extends PureComponent {
    render() {
        const gherkinElRegex = /(Feature|Scenario):.*#\s/gm;
        const stepRegex = /(Given|And\s|Or\s|When|Then).*#\s/gm;
        const skippedStepRegex = /#\sNone(\s*)$/gm;
        let txtcolor = "white"
        let margin = 5;
        const cmdtext = this.props.cmd.text;
        if (cmdtext.match(gherkinElRegex) !== null){
            txtcolor = "#91C6FE";
        }
        else if (cmdtext.match(stepRegex) !== null) {
            margin = 50;
            if (cmdtext.match(skippedStepRegex) !== null) {
                txtcolor = "yellow";
            } else {
                txtcolor = "cyan";
            }
        }
        return <p key={this.props.cmd.id} style={{ marginLeft: margin, marginTop: 2, marginBottom: 0, color: txtcolor }}>{cmdtext}</p>;
    }
}

class SimpleTerminal extends Component {
    constructor() {
        super();
        this.commands = [];
    }

    clearStdout() {
        this.commands = [];
        this.setState({ state: this.state }); //force rerender
    }

    pushToStdout(commandText) {
        const id = this.commands.length + 1;
        this.commands.push(<Command key={id} cmd={{ text: commandText, id: id }}></Command>);
    }

    render() {
        const consoleStyle = {
            backgroundColor: "black",
            color: "white",
            fontFamily: "monospace",
            overflow: "hidden",
            minHeight: "200px",
            minWidth: "100px",
            borderRadius: "8px",
            fontSize: 12
        };
        return (<div style={consoleStyle}>
            {this.commands}
        </div>);
    }
}


export default SimpleTerminal;