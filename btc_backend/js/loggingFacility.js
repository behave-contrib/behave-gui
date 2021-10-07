/* Copyright (c) 2021-present Tomra Systems ASA */
const bunyan = require("bunyan");

const createLogger = () =>{
    const logger = bunyan.createLogger({
        name: "btc_backend",
        streams: [
          {
            level: "trace",
            path: "btc-backend.log"
          }
        ]
      });
    return logger;
};

module.exports = {
    createLogger: createLogger
}