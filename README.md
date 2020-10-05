# manta-mdu

(This "sans-job" branch of mdu works without requiring Manta Jobs. This is
important when using Mantav2 which no longer supports Manta Jobs.)

This is a **prototype** implementation of an "mdu" tool for Manta.  This reports
physical disk utilization for Manta paths that you typically would enumerate
with mfind(1).  The output of this program is an ncdu-compatible file.  Use
`ncdu` to view it.

Use it like this:

    # Clone
    $ git clone https://github.com/joyent/manta-mdu.git
    $ cd manta-mdu
    $ git checkout sans-job

    # Build
    $ npm install
    $ make manta-asset

    # Run
    $ mfind -j SOME-MANTA-DIR | ./bin/mfind2ncdu > ncdu.out

    # Examine the results.
    $ ncdu -f ncdu.out


## Related tools

It's possible to generate an ncdu file for an entire Manta deployment all at
once from Manta's own regular backups.  See [dump\_based](dump_based) for
details.

[manta-physusage](https://github.com/joyent/manta-physusage) provides some tools
that summarize usage on a per-CN and per-account basis.
