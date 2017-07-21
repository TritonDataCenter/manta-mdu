# Dump-based mdu

The mdu tool elsewhere in this repository works by enumerating objects using
`mfind` (or whatever other means an end user might have) and then submitting
them as inputs to a job that retrieves the physical storage used for each
object.  This works well for small- to medium- sized numbers of objects, but it
gets unwieldy after a few tens of thousands of objects.  Some Manta directories
for "admin" and "poseidon" can have millions of objects, and this process is
basically untenable for those (and would be grossly inefficient anyway).

Instead, operators of Manta deployments can use the daily backups of the
metadata tier (in "/poseidon/stor/manatee\_backups") and daily backups of the
storage tier (in "/poseidon/stor/mako") to enumerate all the objects at once and
retrieve the physical space used for every object at once.

This directory contains a few scripts to help with that process.  There are
basically four phases, and they've been separated out so that they can be run
incrementally:

    ph1-metadata.sh: runs a job to extract basic information from metadata dumps
    ph2-storage.sh: runs a job to extract basic information from storage dumps
    ph3-join.sh: runs a job that joins the information from the previous
        two dumps
    ph4-ncdu.sh: runs a job to produce an "ncdu"-format file from the output
        of the previous job

There's also a "common.sh" for common code.

**There are several important caveats about this code:**

- Scripts substantially similar to these have been used to generate whole-Manta
  ncdu files for large deployments.  These scripts incorporate some manual steps
  that were run as part of that, but **they have not been tested in their
  current form.**
- The scripts here currently hardcode specific dumps.  **You will need to modify
  at least ph1-metadata.sh** to indicate which metadata dumps you want to use.
- This approach erroneously counts snaplinks.  That is, N snaplinks to the same
  object will account for N times more physical space used than is actually used
  by Manta.  (This applies to the regular mdu, too.)
- This approach currently ignores the number of copies of an object.  Most
  clients store the default 2 copies of each object, so the actual physical
  usage is twice what this tool reports.  (This applies to the regular mdu,
  too.)
