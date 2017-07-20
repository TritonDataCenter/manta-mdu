/*
 * mdu-reduce.js: prototype implementation that takes the output of
 *
 *     find $MANTA_INPUT_FILE -type f -printf "%s %k %p\n"
 *
 * on a bunch of Manta objects and produces ncdu-compatible output describing
 * the physical storage used by the objects.  The "-printf" option is a GNU find
 * feature, and this invocation emits the file's logical size in bytes, physical
 * size in kilobytes, and full path.  The ncdu format is described at
 * https://dev.yorhel.nl/ncdu/jsonfmt.
 *
 * XXX how to best handle ncopies?
 *
 * XXX document that it doesn't handle snaplinks.  (Could we handle these by
 * using the etag to identify objects with the same objectid?  Maybe even set
 * "ino" property?)
 */

var mod_cmdutil = require('cmdutil');
var mod_lstream = require('lstream');
var mod_jsprim = require('jsprim');
var mod_path = require('path');
var mod_strsplit = require('strsplit');
var mod_stream = require('stream');
var mod_util = require('util');
var mod_vstream = require('vstream');
var mod_mdu = require('../lib/common');

function main()
{
	var lstream, parser, ncdu;

	lstream = new mod_lstream();
	parser = new mod_mdu.MduParserStream();
	ncdu = new MduNcduStream();

	process.stdin.pipe(lstream);
	lstream.pipe(parser);
	parser.pipe(ncdu);
	ncdu.pipe(process.stdout);

	parser.on('error', mod_cmdutil.fail);
	ncdu.on('error', mod_cmdutil.fail);

	process.on('exit', function (code) {
		if (code !== 0) {
			return;
		}

		parser.vsDumpDebug(process.stderr);
		ncdu.vsDumpDebug(process.stderr);
	});
}

/*
 * This stream takes the output of the MduParserStream and produces the
 * ncdu-format output.  Note that we can't assume the input is sorted, so we
 * have to store the whole thing in memory.
 */
function MduNcduStream(uoptions)
{
	var options = mod_jsprim.mergeObjects(
	    uoptions ? uoptions.streamOptions : undefined,
	    { 'objectMode': true }, { 'highWaterMark': 0 });
	mod_stream.Transform.call(this, options);
	mod_vstream.wrapTransform(this);

	this.mdu_tree = {};
}

mod_util.inherits(MduNcduStream, mod_stream.Transform);

MduNcduStream.prototype._transform = function (metadata, _, callback)
{
	var node, dirname, basename, parts, i;

	/*
	 * Insert this entry into the appropriate spot in the tree.  Any number
	 * of the parent directories may not yet be created.
	 */
	node = this.mdu_tree;
	dirname = metadata.mduDirname;
	parts = dirname.split('/');

	for (i = 0; i < parts.length; i++) {
		/*
		 * Our input will generally be normalized, but it's worth
		 * handling special cases: empty components (e.g., "foo//bar")
		 * and "." (e.g., "foo/./bar") are easy enough to handle
		 * directly.
		 */
		if (parts[i].length === 0 || parts[i] == '.') {
			continue;
		}

		/*
		 * ".." is more annoying, and we should never see it, so bail
		 * out if that happens.
		 */
		if (parts[i] == '..') {
			this.vsWarn(new Error(
			    '".." is not supported in paths'), 'nerr_dotdot');
			callback(new Error('".." is not supported in paths'));
			return;
		}

		if (!mod_jsprim.hasKey(node, parts[i])) {
			node[parts[i]] = {};
		} else if (mod_jsprim.hasKey(node[parts[i]], 'mduDirname')) {
			this.vsWarn(new Error(
			    'input contains directory and object with same ' +
			    'name'), 'nerr_conflict');
			callback(new Error('input contains directory and ' +
			    'object with same name'));
			return;
		}

		node = node[parts[i]];
	}

	basename = mod_path.basename(metadata.mduPath);
	if (mod_jsprim.hasKey(node, basename)) {
		this.vsWarn(new Error('duplicate entry'), 'nwarn_dup');
		setImmediate(callback);
		return;
	}

	node[basename] = metadata;
	setImmediate(callback);
};

MduNcduStream.prototype._flush = function (callback)
{
	var roots, nroots;

	/*
	 * It would be nice if there were a well-documented, well-designed
	 * streaming JSON serialization library.
	 */
	this.push('[ 1, 0, ' + JSON.stringify({
	    'progname': 'mdu',
	    'progver': '1.0',
	    'timestamp': Math.floor(Date.now() / 1000)
	}));

	roots = Object.keys(this.mdu_tree);
	nroots = roots.length;
	if (nroots === 0) {
		this.push(']');
	} else if (nroots > 1) {
		/*
		 * We could support this, but we don't currently.
		 */
		callback(new Error('too many roots'));
		return;
	} else {
		this.push(', ');
		this.emitTree(this.mdu_tree[roots[0]], '/' + roots[0]);
		this.push(']');
	}

	this.push(null);
	callback();
};

MduNcduStream.prototype.emitTree = function (node, name)
{
	var self = this;
	var children;

	if (mod_jsprim.hasKey(node, 'mduDirname')) {
		/*
		 * This is an object.
		 */
		this.push(JSON.stringify({
		    'name': name,
		    'dsize': node.mduSizePhysical,
		    'asize': node.mduSizeLogical
		}));
	} else {
		/*
		 * This is a directory.
		 */
		this.push('[ ' + JSON.stringify({ 'name': name }));
		children = Object.keys(node).sort();
		children.forEach(function (c) {
			self.push(',');
			self.emitTree(node[c], c);
		});
		this.push(' ]');
	}
};

main();
