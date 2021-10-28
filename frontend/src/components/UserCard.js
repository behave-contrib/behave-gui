/* Copyright (c) 2021-present Tomra Systems ASA */
import React, { Component } from "react";

class UserCard extends Component {
    constructor() {
        super();
        // Set initial state
        this.state = {
          username: "Not logged in",
        };
      }

      componentDidMount() {
        this.setState({ username: window.btc_user });
      }

      render() {
        if (window.btc_user){
          return(<label>&nbsp;Logged in as: {this.state.username}</label>);
        }
          return(<label/>);
      }
}

export default UserCard;