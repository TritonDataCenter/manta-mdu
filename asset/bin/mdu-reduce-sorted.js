/*
 * mdu-reduce-sorted.js: exactly like mdu-reduce.js, but assumes that its input
 * is sorted first and processes the input online, without reading all the input
 * at once.
 */

var mod_assertplus = require('assert-plus');
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

	lstream = new mod_lstream({ 'highWaterMark': 128 });
	parser = new mod_mdu.MduParserStream();
	ncdu = new MduNcduOnlineStream();

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
 * ncdu-format output, just like the MduOnlineStream.  Unlike that stream, we do
 * assume our input is sorted.
 */
function MduNcduOnlineStream(uoptions)
{
	var options = mod_jsprim.mergeObjects(
	    uoptions ? uoptions.streamOptions : undefined,
	    { 'objectMode': true }, { 'highWaterMark': 0 });
	mod_stream.Transform.call(this, options);
	mod_vstream.wrapTransform(this);

	this.mdu_ctx = [];
	this.mdu_last = null;
	this.mdu_nitems = 0;
	this.mdu_nfiles = 0;
	this.mdu_preamble = false;
}

mod_util.inherits(MduNcduOnlineStream, mod_stream.Transform);

MduNcduOnlineStream.prototype.preamble = function ()
{
	mod_assertplus.ok(!this.mdu_preamble);
	this.mdu_preamble = true;
	this.push('[ 1, 0, ' + JSON.stringify({
	    'progname': 'mdu-sorted',
	    'progver': '1.0',
	    'timestamp': Math.floor(Date.now() / 1000)
	}));
};

MduNcduOnlineStream.prototype._transform = function (metadata, _, callback)
{
	var dirname, parts, ctxi, entryi, rctxi;
	var err, cmp;

	if (!this.mdu_preamble) {
		this.preamble();
	}

	if (this.mdu_last !== null) {
		cmp = this.mdu_last.localeCompare(metadata.mduPath);
		if (cmp > 0) {
			err = new Error('unsorted input line: ' +
			    JSON.stringify(metadata.mduPath));
			callback(err);
			return;
		}

		if (cmp === 0) {
			err = new Error('duplicate entry: ' +
			    JSON.stringify(metadata.mduPath));
			this.vsWarn(err, 'nwarn_dup');
			setImmediate(callback);
			return;
		}
	}

	this.mdu_last = metadata.mduPath;

	/*
	 * Figure out how to get from our current directory to the directory
	 * where this object lives.  We compare our current directory with the
	 * one we're going to, component by component, until we get to the end
	 * of either one or the first non-matching component.
	 */
	dirname = metadata.mduDirname;
	parts = dirname.split('/');
	for (ctxi = 0, entryi = 0; ; ctxi++, entryi++) {
		/* Skip any empty or "." entries. */
		while (entryi < parts.length &&
		    (parts[entryi].length === 0 || parts[entryi] == '.')) {
			entryi++;
		}

		if (ctxi == this.mdu_ctx.length) {
			break;
		}

		if (entryi == parts.length) {
			break;
		}

		/* Bail out on "..". */
		if (parts[entryi] == '..') {
			err = new Error('".." is not supported in paths');
			this.vsWarn(err, 'nerr_dotdot');
			callback(err);
			return;
		}

		if (this.mdu_ctx[ctxi] != parts[entryi]) {
			break;
		}
	}

	/*
	 * For any remaining directory components in our current context, there
	 * is no more output to emit.  Ascend out of each of these.
	 */
	for (rctxi = this.mdu_ctx.length - 1; rctxi >= ctxi; rctxi--) {
		this.directoryAscend(this.mdu_ctx[rctxi]);
	}

	/*
	 * For any remaining directory components in the new context, we need to
	 * descend into them.
	 */
	while (entryi < parts.length) {
		this.directoryDescend(parts[entryi++]);
	}

	/* This assertion is (relatively) expensive. */
	// mod_assertplus.equal(
	//     mod_path.join.apply(null, this.mdu_ctx),
	//     mod_path.join.apply(null, parts));
	this.mdu_nfiles++;
	this.mdu_nitems++;

	this.push(', ' + JSON.stringify({
	    'name': mod_path.basename(metadata.mduPath),
	    'dsize': metadata.mduSizePhysical,
	    'asize': metadata.mduSizeLogical
	}));

	callback();
};

MduNcduOnlineStream.prototype.directoryAscend = function (dirname)
{
	mod_assertplus.equal(this.mdu_ctx[this.mdu_ctx.length - 1], dirname);
	this.mdu_ctx.pop();
	this.push(' ]');
};

MduNcduOnlineStream.prototype.directoryDescend = function (dirname)
{
	this.push(', [ ' + JSON.stringify({ 'name': dirname }));
	this.mdu_ctx.push(dirname);
};

MduNcduOnlineStream.prototype._flush = function (callback)
{
	if (!this.mdu_preamble) {
		this.preamble();
	}

	while (this.mdu_ctx.length > 0) {
		this.directoryAscend(this.mdu_ctx[this.mdu_ctx.length - 1]);
	}

	this.push(']');
	this.push(null);
	callback();
};

main();
