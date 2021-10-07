/* Copyright (c) 2021-present Tomra Systems ASA */
import React from "react"
import SimpleTerminal from "./components/SimpleTerminal"

class RunTerminal extends React.Component {
  constructor(props) {
    super(props)
    this.terminal = React.createRef();
    this.consoleScrollRef = React.createRef();
    this.topScrollRef = React.createRef();
    this.handleKeyDown = this.handleKeyDown.bind(this)
    this.state = {
      freshCleared: false,
      scroll: true
    }
  }

  scrollToRef = (pos) => {
    if (this.state.scroll) {
      window.scrollTo(0, pos);
    }
  }

  handleKeyDown(e) {
    e = e || window.event;
    if (this.props.run && e.ctrlKey) {
      if (e.keyCode === 38) { // up arrow
        this.setState({ scroll: false });
      } else if (e.keyCode === 40) { // down arrow
        this.setState({ scroll: true });
      }
    }
  }

  getSnapshotBeforeUpdate(prevProps, prevState, snapshot) {

    if (this.state.freshCleared === true) {
      this.scrollToRef(this.topScrollRef.current.offsetTop);
      this.setState({ freshCleared: false });
    }

    if (this.props.clearSemaphore !== prevProps.clearSemaphore) {
      this.terminal.current.clearStdout();
      this.setState({
        freshCleared: true,
        scroll: true
      });
    }

    if (prevProps != null && prevProps.commandTs !== this.props.commandTs) {
      this.terminal.current.pushToStdout(this.props.commandText);
      if (this.props.run) {
        this.scrollToRef(this.consoleScrollRef.current.offsetTop - 600);
      }
    }

    return null;
  }

  componentDidUpdate(prevProps, prevState) {
    return null;
  }

  componentDidMount() {
    window.addEventListener("keydown", this.handleKeyDown);
  }

  render() {
    return (
      <div>
        <div ref={this.topScrollRef}></div>
        <SimpleTerminal ref={this.terminal}></SimpleTerminal>
        <div ref={this.consoleScrollRef}></div>
      </div>
    )
  }
}

export default RunTerminal;