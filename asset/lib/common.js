/*
 * Common facilities used by both mdu-reduce and mdu-reduce-sorted
 */

var mod_jsprim = require('jsprim');
var mod_path = require('path');
var mod_strsplit = require('strsplit');
var mod_stream = require('stream');
var mod_util = require('util');
var mod_vstream = require('vstream');

exports.MduParserStream = MduParserStream;

/*
 * This stream transforms lines of input (specified above) into objects with
 * properties:
 *
 *     mduPath		path to the Manta object
 *
 *     mduSizeLogical	logical size of the Manta object (in bytes)
 *
 *     mduSizePhysical	physical size of the Manta object (in bytes)
 */
function MduParserStream(uoptions)
{
	var options = mod_jsprim.mergeObjects(
	    uoptions ? uoptions.streamOptions : undefined,
	    { 'objectMode': true }, { 'highWaterMark': 0 });
	mod_stream.Transform.call(this, options);
	mod_vstream.wrapTransform(this);
}

mod_util.inherits(MduParserStream, mod_stream.Transform);

MduParserStream.prototype._transform = function (line, _, callback)
{
	var dirent = JSON.parse(line);

	this.push({
	    'mduDirname': dirent.parent,
	    'mduPath': dirent.name,
	    'mduSizeLogical': dirent.size,
	    'mduSizePhysical': dirent.size
	});
	setImmediate(callback);
};

/*
 * Empirically, this implementation of "dirname" is over 50 times faster than
 * Node's.  (This was tested using synthetic input built to be similar to our
 * input here.)
 */
function dirname(name)
{
	var c;

	/*
	 * Walk backwards from the end to ignore trailing slashes.
	 */
	for (c = name.length - 1; c > 0 && name.charAt(c) == '/'; c--) {
		/* jsl:pass */
	}

	if (c === 0 && name.charAt(c) == '/') {
		return ('/');
	}

	/*
	 * Walk over the basename component (any non-slash characters).
	 */
	for (; c > 0 && name.charAt(c) != '/'; c--) {
		/* jsl:pass */
	}

	/*
	 * Finally, walk back over the last set of slashes.
	 */
	for (; c > 0 && name.charAt(c) == '/'; c--) {
		/* jsl:pass */
	}

	if (c <= 0) {
		if (name.length > 0 && name[0] == '/') {
			return ('/');
		}

		return ('.');
	}


	return (name.substr(0, c + 1));
}
