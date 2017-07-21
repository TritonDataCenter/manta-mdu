#!/bin/bash

source common.sh

mbackups=
mbackups="$mbackups /poseidon/stor/manatee_backups/2.moray.us-east.joyent.us/2017/07/18/00"
mbackups="$mbackups /poseidon/stor/manatee_backups/3.moray.us-east.joyent.us/2017/07/18/00"
mbackups="$mbackups /poseidon/stor/manatee_backups/4.moray.us-east.joyent.us/2017/07/18/00"

echo "processing manatee backups for path info ... "
job=$(mjob create --open --init='npm install -g json' --disk=64 -m 'gzip -dc | json -ag -c "this.entry && this.entry[11] === \"object\"" -e "if (this.entry) { this.makoPath = \"/manta/\" + this.entry[9] + \"/\" + this.entry[10]; this.mantaPath = \"/manta\" + this.entry[2]; }" -d "\t" makoPath mantaPath' --disk=128 -r 'sort -u' < /dev/null)
echo job $job
mfind -t o -n '^manta-' $mbackups | mjob addinputs $job
waitjob $job
mjob outputs $job
