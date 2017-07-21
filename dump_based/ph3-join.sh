#!/bin/bash

source common.sh

if [[ $# != 2 ]]; then
	echo "usage: ${BASH_SOURCE[0]} METADATA_JOBID STORAGE_JOBID" >&2
	exit 2
fi

metadata_jobid="$1"
storage_jobid="$2"

echo "fetching list of outputs for each job ... "
metadata_outputs="$(mjob outputs "$metadata_jobid")"
storage_outputs="$(mjob outputs "$storage_jobid")"

echo "joining mako dumps with path info ... "
job=$(mjob create --disk=256 -m "mget "$metadata_outputs" | gjoin -j 1 -o 1.2,1.4,2.2 \$MANTA_INPUT_FILE - | sort -k3,3" --open < /dev/null)
echo job $job
echo "$storage_outputs" | mjob addinputs $job
waitjob $job
mjob outputs $job
