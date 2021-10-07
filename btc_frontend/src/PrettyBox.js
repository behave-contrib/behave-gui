/* Copyright (c) 2021-present Tomra Systems ASA */
import React, { PureComponent } from "react";
import hljs from "highlight.js";
import "highlight.js/styles/googlecode.css"
import python from "highlight.js/lib/languages/python";

hljs.registerLanguage("python", python);

class PrettyBox extends PureComponent {
    componentDidMount() {
        hljs.highlightAll();
    }
    render() {
        return (
            <div>
                <pre className="prettyprint">
                    <code className="language-python">
                        {this.props.fileName + "\n"}
                        {this.props.code}
                    </code>
                </pre>
            </div>
        );
    }
}

export default PrettyBox;