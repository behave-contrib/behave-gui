/* Copyright (c) 2021-present Tomra Systems ASA */
import React, { Component } from "react";
import Card from "react-bootstrap/Card";

class ParamsCard extends Component {
    constructor() {
        super();
        // Set initial state
        this.state = {
            target: "",
            sw: ""
        };
    }

    getParams() {
        const params = {};
        const parser = document.createElement("a");
        parser.href = window.location.href;
        const query = parser.search.substring(1);
        const vars = query.split("&");
        for (var i = 0; i < vars.length; i++) {
            var pair = vars[i].split("=");
            params[pair[0]] = decodeURIComponent(pair[1]);
        }
        return params;
    };

    componentDidMount() {
        const params = this.getParams();
        const target = params["target"] ?? "";
        const sw = params["sw"] ?? "";
        this.setState({
            target: target,
            sw: sw
        });
    }

    render() {
        if(!this.state.target && !this.state.sw){
            return(<></>)
        }
        let rmvEl;
        let swEl;
        if (this.state.target) {
            rmvEl = <><Card.Title>Target</Card.Title><Card.Subtitle className="mb-2 text-muted">{this.state.target}</Card.Subtitle></>
        }
        if (this.state.sw) {
            swEl = <><Card.Title>Sw</Card.Title><Card.Subtitle className="mb-2 text-muted">{this.state.sw}</Card.Subtitle></>
        }
        return (
            <Card style={{ width: "20rem" }}>
                <Card.Body>
                    {rmvEl}
                    {swEl}
                </Card.Body>
            </Card>
        );
    }
}

export default ParamsCard;