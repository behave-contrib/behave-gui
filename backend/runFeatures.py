# Copyright (c) 2021-present Tomra Systems ASA
import configparser
import functools
import importlib
import os
import sys

from behave.__main__ import main as behave_main

class defaultRunner():
    def runFeature(self, scriptArgs):
        # raise Exception("Supplied args: %s" % scriptArgs)
        behave_main(scriptArgs)

def get_runner():
    runner_located = False
    config_file_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "btc.ini"))
    if os.path.exists(config_file_path):
        config = configparser.ConfigParser()
        config.read(config_file_path)
        runner_section = "runner"
        if runner_section in config.sections():
            try:
                located_runner = importlib.import_module(config.get(runner_section, "runnerName"), config.get(runner_section, "runnerPackage"))
                runner_located = True
                return located_runner
            except:
                pass
    if not runner_located:
        return defaultRunner()

def locaterunner(func):
    @functools.wraps(func) # wrap it neatly
    def wrapper():
        located_runner = get_runner()
        return func(located_runner)  # call the wrapped function
    return wrapper

@locaterunner
def run_feature(runner=None):
    scriptArgs = sys.argv[1:]
    runner.runFeature(scriptArgs)

run_feature()
