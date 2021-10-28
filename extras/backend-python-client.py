"""Client that connects via websocket to the backend

This is a client that can be used from an automation server (ex: Jenkins)
to connect to the backend via websocket and run a feature. With this setup
you do not need to deploy any test code or resoruces to your automation
server to run a test. Code and resources can be deployed to Behave-gui 
backend server instances.

Example command line arguments: python3 backend-python-client.py --address localhost:8081 --target atlas --user domain\\myuser --sw 31.2.1 --feature "|features|examples|documentation.feature"

"""

#!/usr/bin/env python
# -*- coding: utf-8 -*-

import argparse
import re
import time
from queue import Queue

import socketio

sio = socketio.Client()
q = Queue()


@sio.event
def connect():
    connect_msg = "Connection with scenario server established"
    print(connect_msg)


@sio.event
def disconnect():
    print("Unexpectedly disconnected from server")
    sio.disconnect()


@sio.on("errormsg")
def on_errormsg(errorMsg):
    print(errorMsg)
    q.put(True)


@sio.on("event")
def on_message(datas):
    color_code = 36 # cyan
    mask = "\033[%d;1;m%s\033[0m"
    for data in datas:
        if re.match(r"^\s*Given\s|^\s*And\s|^\s*Or\s|^\s*When\s|^\s*Then\s", data):
            if re.match(r".*#\sNone\s*$", data): # Not run - use yellow text
                color_code=33
            print(mask % (color_code, data))
        elif re.match(r"^\s*(Feature|Scenario):\s", data):
            print(mask % (34, data)) # Blue
        else:
            print(data)
        is_end = re.match(r"^Took\s\d{1,}m", data)
        if is_end:
            sio.disconnect()
            q.put(False)
        is_failing_status = re.match(r"^0 features passed", data)
        if is_failing_status:
            q.put(True)


def run(address, **kwargs):
    sio.connect("http://%s" % address)
    sio.emit("run", kwargs)
    sio.wait()
    time.sleep(5)
    if not q.empty():
        failed = q.get()
        if failed:
            assert failed == False, "Scenario failed: %s" % failed
        else:
            print("Feature %s passed." % kwargs["feature"])
    else:
        print("Failed. Could not retrieve scenario result.")
    print("Scenario script finished.")


parser = argparse.ArgumentParser()
parser.add_argument("--address", required=True, help="Scenario server address (hostname:port)")
parser.add_argument("--target", help="Target machine")
parser.add_argument("--user", help="Test user")
parser.add_argument("--sw", help="Test software")
parser.add_argument("--feature", required=True, help="Feature to run")
parser.add_argument("--testSetId", help="Id to group tests (ex. Jenkins build number)")
parser.add_argument("-D", help="Behave userdata variables", action="append")

args = parser.parse_args()
print(args)
argsdic = vars(args)
argsdic["feature"] = args.feature.replace("|", "/")

if not args.D:
    argsdic.pop("D", None)
print(args)

run(**argsdic)
