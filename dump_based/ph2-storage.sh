#!/bin/bash

source common.sh

echo "combining mako dumps ... "
job=$(mjob create --disk=128 -r 'sort -u' --open < /dev/null)
echo job $job
mfind -t o /poseidon/stor/mako | mjob addinputs $job
waitjob $job
mjob outputs $job
