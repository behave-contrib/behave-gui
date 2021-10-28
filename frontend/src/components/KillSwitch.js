/* Copyright (c) 2021-present Tomra Systems ASA */
import React from "react";

const KillSwitch = ({ clickHandler }) => {
    const spanStyle = {
        color: "red",
        fontWeight: "bold",
        cursor: "pointer"
    };

    return (<span id="killswtich" style={spanStyle} title="Stop test" onClick={clickHandler}>&#x2718;</span>);
}

export default KillSwitch;