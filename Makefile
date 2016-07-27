#
# Copyright (c) 2016, Joyent, Inc. All rights reserved.
#
# Makefile: top-level Makefile
#
# This Makefile contains only repo-specific logic and uses included makefiles
# to supply common targets (javascriptlint, jsstyle, restdown, etc.), which are
# used by other repos as well.
#

#
# Tools
#
NPM		 = npm

#
# Files
#
JSON_FILES	 = package.json
BASH_FILES	 = bin/mdujob
JS_FILES	:= $(shell find asset -name '*.js')
JSL_FILES_NODE	 = $(JS_FILES)
JSSTYLE_FILES	 = $(JS_FILES)
JSL_CONF_NODE	 = tools/jsl.node.conf

#
# Manta asset configuration
#
MANTA_USER		?= \
    $(error MANTA_USER must be specified in the environment)
# Local file representing the asset
MANTA_ASSET_FILE	= manta-mdu.tgz
# Manta object where the asset goes
MANTA_ASSET_OBJECT      = \
    /$(MANTA_USER)/public/manta-mdu-prototype/$(MANTA_ASSET_FILE)
# Manta directory where the asset goes
MANTA_ASSET_DIRECTORY	= $(dir $(MANTA_ASSET_OBJECT))
# Local paths to include with the asset
MANTA_ASSET_INCLUDE     = asset node_modules

.PHONY: all
all:
	$(NPM) install

.PHONY: manta-asset
manta-asset: | $(MANTA_ASSET_FILE)
	mmkdir -p "$(MANTA_ASSET_DIRECTORY)"
	mput -f "$(MANTA_ASSET_FILE)" "$(MANTA_ASSET_OBJECT)"

$(MANTA_ASSET_FILE): all
	tar czf "$(MANTA_ASSET_FILE)" $(MANTA_ASSET_INCLUDE)

include ./Makefile.targ
