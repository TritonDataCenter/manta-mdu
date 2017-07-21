#!/bin/bash

source common.sh

if [[ $# != 1 ]]; then
	echo "usage: ${BASH_SOURCE[0]} JOIN_JOBID" >&2
	exit 2
fi

join_jobid="$1"

echo "fetching list of outputs for each job ... "
join_outputs="$(mjob outputs "$join_jobid")"

echo "producing ncdu output file ... "
job="$(mjob create \
    --asset="/$MANTA_USER/public/manta-mdu-prototype/manta-mdu.tgz" \
    --init='tar xzf /assets/dap/public/manta-mdu-prototype/manta-mdu.tgz' \
    --map="node /asset/bin/mdu-reduce-sorted.js" --open < /dev/null)"
echo job $job
echo "$join_outputs" | mjob addinputs $job
waitjob $job
mjob outputs $job
