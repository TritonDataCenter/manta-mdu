# manta-mdu

This is a **prototype** implementation of an "mdu" tool for Manta.  This reports
physical disk utilization for Manta paths that you typically would enumerate
with mfind(1).  The output of this program is an ncdu-compatible file.  Use
`ncdu` to view it.

Use it like this:

    # Clone the repository
    $ git clone ...
    $ cd manta-mdu

    # Install dependencies and upload tarball to Manta.  You may
    # need to do this on SmartOS.
    $ npm install
    $ make manta-asset

    # Run the tool.
    $ mfind ... | ./bin/mdujob > ncdu.out

    # Examine the results.
    $ ncdu -f ncdu.out

This should eventually be folded into the node-manta CLI suite, but we'll want
to work out a bunch of details:

- How do we build and manage the asset?  ("mjob cost" may provide an example for
  this.)
- How do we deal with "ncopies"?  Today, this tool ignores that.
- How do we handle snaplinks?  This tool doesn't take them into account, but it
  could probably do so using object etags.  This, along with handling "ncopies",
  would be easier if we built the mfind step into the tool itself.
- By default, this tool reports physical usage, which is less relevant for end
  users.  It should probably look at logical usage by default (which is much
  easier).
- Add tests.
