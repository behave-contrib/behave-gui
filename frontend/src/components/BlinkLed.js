/* Copyright (c) 2021-present Tomra Systems ASA */
import React from "react";

class BlinkLed extends React.Component {
    constructor() {
        super();
        this.state = {
            ledColor: "gray"
        }
    }

    componentDidMount() {
        this._isMounted = true;
    }

    componentWillUnmount() {
        this._isMounted = false;
    }

    blink = () => {
        if (this._isMounted) {
            this.setState({
                ledColor: "lime"
            });

            setTimeout(() => {
                if (this._isMounted) {
                    this.setState({
                        ledColor: "gray"
                    })
                }

            }, 500);
        }
    }

    render = () => {
        const spanStyle = {
            color: this.state.ledColor,
            fontWeight: "bold"
        };

        return (<span title="Target activity" style={spanStyle}>&#9776;</span>)
    }
}

export default BlinkLed;