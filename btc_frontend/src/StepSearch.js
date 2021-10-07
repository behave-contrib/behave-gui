/* Copyright (c) 2021-present Tomra Systems ASA */
import React, { Component } from "react";
import Downshift from "downshift";
import UserCard from "./components/UserCard";

class StepSearch extends Component {
  constructor() {
    super();
    this.downshiftCtrl = React.createRef();
  }
  copyToClipboard(str) {
    const el = document.createElement("textarea");
    el.value = str;
    document.body.appendChild(el);
    el.select();
    document.execCommand("copy");
    document.body.removeChild(el);
    setTimeout(this.resetForm, 750);
  }
  resetForm = () => {
    this.downshiftCtrl.current.clearSelection();
  };
  getNavigateUrl = (item) => {
    const target = new URL(window.location).searchParams.get("target");
    return `index.html?feature=/${item.file}&target=${target}`;
  }
  render() {
    const fileOptionItems = this.props.fileFilterOptions.map(opt => (
      <option key={opt.value}>{opt.label}</option>
    ));

    const tagOptionItems = this.props.tagFilterOptions.map(opt => (
      <option key={opt.value}>{opt.label}</option>
    ));

    const featureOptionItems = this.props.scenarioFilterOptions.map(opt => (
      <option key={opt.value}>{opt.label}</option>
    ));

    return (
      <Downshift
        ref={this.downshiftCtrl}
        onChange={selection => {
          if (selection) {
            this.copyToClipboard(selection.value);
          }
        }}
        itemToString={item => (item ? item.value : "")}
      >
        {({
          getInputProps,
          getItemProps,
          getLabelProps,
          getMenuProps,
          isOpen,
          inputValue,
          highlightedIndex,
          selectedItem
        }) => (
          <div className="container-fluid">
            <div className="form-row">
              <div className="col">
                <label htmlFor="tagfilter">Tag filter:</label>
                <select id="tagfilter" onChange={this.props.tagFilterChanged}>
                  <option>All</option>
                  {tagOptionItems}
                </select>
                &nbsp;
                <label htmlFor="filefilter">File filter:</label>
                <select id="filfilter" onChange={this.props.fileFilterChanged}>
                  <option>All</option>
                  {fileOptionItems}
                </select>
                &nbsp;
                <label htmlFor="scenariofilter">Scenario filter:</label>
                <select
                  id="scenariofilter"
                  onChange={this.props.scenarioFilterChanged}
                >
                  <option>All</option>
                  {featureOptionItems}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="col">
                <label {...getLabelProps()}>Search steps: </label>
                <input {...getInputProps()} style={{ width: 450 }} />
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={this.resetForm}
                >
                  Clear
                </button>
                &nbsp;
                <UserCard/>
              </div>
            </div>
            <div className="form-row">
              <div className="col">
                <ul {...getMenuProps()}>
                  {isOpen
                    ? this.props.items
                        .filter(
                          item =>
                            !inputValue ||
                            item.value
                              .toLowerCase()
                              .includes(inputValue.toLowerCase())
                        )
                        .map((item, index) => (
                          <li
                            {...getItemProps({
                              key: item.key,
                              index,
                              item,
                              style: {
                                backgroundColor:
                                  highlightedIndex === index
                                    ? "lightgray"
                                    : null,
                                fontWeight:
                                  selectedItem === item ? "bold" : "normal"
                              }
                            })}
                          >
                            {item.value}{" "}
                            <sup>
                            <a href={this.getNavigateUrl(item)} target="_blank" rel="noopener noreferrer">
                              <font color="blue">{item.origin}</font>
                              </a>
                            </sup>
                          </li>
                        ))
                    : null}
                </ul>
              </div>
            </div>
          </div>
        )}
      </Downshift>
    );
  }
}

export default StepSearch;