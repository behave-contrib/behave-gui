/* Copyright (c) 2021-present Tomra Systems ASA */
import React, { Component } from "react";
import PropTypes from "prop-types";

class ReservedTargets extends Component {
  constructor() {
    super();
    // Set initial state
    this.state = {
      machines: []
    };
  }

  getSnapshotBeforeUpdate(prevProps, prevState, snapshot) {
    if (prevProps != null && prevProps.run !== this.props.run && this.props.run) {
      this.getMachinesInUse();
    }
    return null;
  }

  componentDidUpdate(prevProps, prevState) {
    return null;
  }

  getMachinesInUse() {
    fetch(`http://${this.props.hostName}:8081/machines`, {
      mode: "cors",
      method: "GET"
    }).then(x => {
      x.json().then(j => {
        this.setState({ machines: j.recordset });
      });
    });
  }
  componentDidMount() {
    setInterval(() => {
      if (this.props.run) {
        this.getMachinesInUse();
      }
    }, 10000);
  }

  render() {
    const machineNodes = this.state.machines.map(machine => {
      return <li key={machine.machine}>{machine.machine}</li>;
    });

    return (
      <>
        <p>
          Targets currently in use:
        </p>
        <ul>{machineNodes}</ul>
      </>
    );
  }
}

ReservedTargets.propTypes = {
  hostName: PropTypes.string
};

export default ReservedTargets;
