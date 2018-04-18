/****************************************************************************
 * Copyright (C) 2009-2010 GGA Software Services LLC
 *
 * This file may be distributed and/or modified under the terms of the
 * GNU Affero General Public License version 3 as published by the Free
 * Software Foundation and appearing in the file LICENSE.GPL included in
 * the packaging of this file.
 *
 * This file is provided AS IS with NO WARRANTY OF ANY KIND, INCLUDING THE
 * WARRANTY OF DESIGN, MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE.
 ***************************************************************************/

if (!window.Prototype)
	throw new Error("Prototype.js should be loaded first");
if (!window.rnd || !rnd.ReStruct)
	throw new Error("rnd.MolData should be defined prior to loading this file");

rnd.DEBUG = false;

rnd.logcnt = 0;
rnd.logmouse = false;
rnd.hl = false;

rnd.logMethod = function () { };
//rnd.logMethod = function (method) {console.log("METHOD: " + method);}

rnd.RenderDummy = function (clientArea, scale, opt, viewSz)
{
	this.clientArea = clientArea = $(clientArea);
	clientArea.innerHTML = "";
	this.paper = new Raphael(clientArea);
	this.paper.rect(0, 0, 100, 100).attr({
		'fill':'#0F0',
		'stroke':'none'
	});
	this.setMolecule = function(){};
	this.update = function(){};
};

rnd.RenderOptions = function (opt)
{
	opt = opt || {};

	// flags for debugging
	this.showSelectionRegions = opt.showSelectionRegions || false;
	this.showAtomIds = opt.showAtomIds || false;
	this.showBondIds = opt.showBondIds || false;
	this.showHalfBondIds = opt.showHalfBondIds || false;
	this.showLoopIds = opt.showLoopIds || false;

	// rendering customization flags
	this.showValenceWarnings = !Object.isUndefined(opt.showValenceWarnings) ? opt.showValenceWarnings : true;
	this.autoScale = opt.autoScale || false; // scale structure to fit into the given view box, used in view mode
	this.autoScaleMargin = opt.autoScaleMargin || 0;
	this.atomColoring = opt.atomColoring || 0;
	this.hideImplicitHydrogen = opt.hideImplicitHydrogen || false;
	this.hideTerminalLabels = opt.hideTerminalLabels || false;
	this.ignoreMouseEvents = opt.ignoreMouseEvents || false; // for view mode
	this.selectionDistanceCoefficient = (opt.selectionDistanceCoefficient || 0.4) - 0;
}

rnd.Render = function (clientArea, scale, opt, viewSz)
{
	this.opt = new rnd.RenderOptions(opt);

	this.useOldZoom = Prototype.Browser.IE;
	this.scale = scale || 100;
	this.baseScale = this.scale;
	this.offset = new util.Vec2();
	this.clientArea = clientArea = $(clientArea);
	clientArea.innerHTML = "";
	this.paper = new Raphael(clientArea);
	this.size = new util.Vec2();
	this.viewSz = viewSz || new util.Vec2(clientArea['clientWidth'] || 100, clientArea['clientHeight'] || 100);
	this.bb = new util.Box2Abs(new util.Vec2(), this.viewSz);
	this.dirty = true;
	this.selectionRect = null;
	this.rxnArrow = null;
	this.rxnMode = false;
	this.zoom = 1.0;

	var render = this;
	var valueT = 0, valueL = 0;
	var element = clientArea;
	do {
		valueT += element.offsetTop  || 0;
		valueL += element.offsetLeft || 0;
		element = element.offsetParent;
	} while (element);

	this.clientAreaPos = new util.Vec2(valueL, valueT);

    // [RB] KETCHER-396 (Main toolbar is grayed after the Shift-selection of some atoms/bonds)
    // here we prevent that freaking "accelerators menu" on IE8
    //BEGIN
    clientArea.observe('selectstart', function(event) {
        util.stopEventPropagation(event); return util.preventDefault(event);
    });
    //END

    // rbalabanov: two-fingers scrolling & zooming for iPad
    // TODO should be moved to touch.js module, re-factoring needed
    //BEGIN
    var self = this;
    self.longTapFlag = false;
    self.longTapTimeout = null;
    self.longTapTouchstart = null;

    self.setLongTapTimeout = function(event) {
        self.longTapFlag = false;
        self.longTapTouchstart = event;
        self.longTapTimeout = setTimeout(function() {
            self.longTapFlag = true;
            self.longTapTimeout = null;
        }, 500);
    };

    self.resetLongTapTimeout = function(resetFlag) {
        clearTimeout(self.longTapTimeout);
        self.longTapTimeout = null;
        if (resetFlag) {
            self.longTapTouchstart = null;
            self.longTapFlag = false;
        }
    };

    clientArea.observe('touchstart', function(event) {
        self.resetLongTapTimeout(true);
        if (event.touches.length == 2) {
            this._tui = this._tui || {};
            this._tui.center = {
                pageX: (event.touches[0].pageX + event.touches[1].pageX) / 2,
                pageY: (event.touches[0].pageY + event.touches[1].pageY) / 2
            };
            ui.setZoomStaticPointInit(ui.page2obj(this._tui.center));
        } else if (event.touches.length == 1) {
            self.setLongTapTimeout(event);
        }
    });
    clientArea.observe('touchmove', function(event) {
        self.resetLongTapTimeout(true);
        if ('_tui' in this && event.touches.length == 2) {
            this._tui.center = {
                pageX : (event.touches[0].pageX + event.touches[1].pageX) / 2,
                pageY : (event.touches[0].pageY + event.touches[1].pageY) / 2
            };
        }
    });
    clientArea.observe('gesturestart', function(event) {
        this._tui = this._tui || {};
        this._tui.scale0 = ui.render.zoom;
        event.preventDefault();
    });
    clientArea.observe('gesturechange', function(event) {
        ui.setZoomStaticPoint(this._tui.scale0 * event.scale, ui.page2canvas2(this._tui.center));
        ui.render.update();
        event.preventDefault();
    });
    clientArea.observe('gestureend', function(event) {
        delete this._tui;
        event.preventDefault();
    });
    //END

	clientArea.observe('onresize', function(event) {
        render.onResize();
    });

    // rbalabanov: here is temporary fix for "drag issue" on iPad
    //BEGIN
    if ('hiddenPaths' in rnd.ReStruct.prototype) {
        clientArea.observe('touchend', function(event) {
            if (event.touches.length == 0) {
                while (rnd.ReStruct.prototype.hiddenPaths.length > 0) rnd.ReStruct.prototype.hiddenPaths.pop().remove();
            }
        });
    }
    //END

    //rbalabanov: temporary
    //BEGIN
    clientArea.observe('touchend', function(event) {
        self.resetLongTapTimeout(false);
        if (self.longTapFlag) {
            ui.render.current_tool && ui.render.current_tool.processEvent('OnDblClick', self.longTapTouchstart);
            self.resetLongTapTimeout(true);
            return util.preventDefault(event);
        } else if (event.touches.length == 0) {
            ui.render.current_tool && ui.render.current_tool.processEvent('OnMouseUp', event);
        }
    });
    //END

        if (!this.opt.ignoreMouseEvents) {
            // assign canvas events handlers
            ['Click', 'DblClick', 'MouseDown', 'MouseMove', 'MouseUp', 'MouseLeave'].each(function(eventName){
                var bindEventName = eventName.toLowerCase();
                bindEventName = EventMap[bindEventName] || bindEventName;
                clientArea.observe(bindEventName, function(event) {
                    if (eventName != 'MouseLeave') if (!ui || !ui.is_touch) {
                        // TODO: karulin: fix this on touch devices if needed
                        var co = clientArea.cumulativeOffset();
                        co = new util.Vec2(co[0], co[1]);
                        var vp = new util.Vec2(event.clientX, event.clientY).sub(co);
                        var sz = new util.Vec2(clientArea.clientWidth, clientArea.clientHeight);
                        if (!(vp.x > 0 && vp.y > 0 && vp.x < sz.x && vp.y < sz.y)) {// ignore events on the hidden part of the canvas
                            if (eventName == "MouseMove") {
                                // [RB] here we alse emulate mouseleave when user drags mouse over toolbar (see KETCHER-433)
                                ui.render.current_tool.processEvent('OnMouseLeave', event);
                            }
                            return util.preventDefault(event);
                        }
                    }

                    ui.render.current_tool.processEvent('On' + eventName, event);
                    util.stopEventPropagation(event);
                    if (bindEventName != 'touchstart' && (bindEventName != 'touchmove' || event.touches.length != 2))
                        return util.preventDefault(event);
                });
            }, this);
        }

	this.ctab = new rnd.ReStruct(new chem.Struct(), this);
	this.settings = null;
	this.styles = null;

	this.onCanvasOffsetChanged = null; //function(newOffset, oldOffset){};
	this.onCanvasSizeChanged = null; //function(newSize, oldSize){};
};

rnd.Render.prototype.view2scaled = function (p, isRelative) {
    var scroll = ui.scrollPos();
    if (!this.useOldZoom) {
        p = p.scaled(1/this.zoom);
        scroll = scroll.scaled(1/this.zoom);
    }
    p = isRelative ? p : p.add(scroll).sub(this.offset);
    return p;
};

rnd.Render.prototype.scaled2view = function (p, isRelative) {
	p = isRelative ? p : p.add(this.offset).sub(ui.scrollPos().scaled(1/this.zoom));
	if (!this.useOldZoom)
		p = p.scaled(this.zoom);
	return p;
};

rnd.Render.prototype.scaled2obj = function (v) {
	return v.scaled(1 / this.settings.scaleFactor);
};

rnd.Render.prototype.obj2scaled = function (v) {
	return v.scaled(this.settings.scaleFactor);
};

rnd.Render.prototype.view2obj = function (v, isRelative) {
	return this.scaled2obj(this.view2scaled(v, isRelative));
};

rnd.Render.prototype.obj2view = function (v, isRelative) {
	return this.scaled2view(this.obj2scaled(v, isRelative));
};

rnd.Render.prototype.findItem = function(event, maps, skip) {
    var ci = this.findClosestItem(
        'ui' in window && 'page2obj' in ui
            ? new util.Vec2(ui.page2obj(event))
            : new util.Vec2(event.pageX, event.pageY).sub(this.clientAreaPos),
        maps,
        skip
    );
    //rbalabanov: let it be this way at the moment
    if (ci.type == 'Atom') ci.map = 'atoms';
    else if (ci.type == 'Bond') ci.map = 'bonds';
    else if (ci.type == 'SGroup') ci.map = 'sgroups';
    else if (ci.type == 'DataSGroupData') ci.map = 'sgroupData';
    else if (ci.type == 'RxnArrow') ci.map = 'rxnArrows';
    else if (ci.type == 'RxnPlus') ci.map = 'rxnPluses';
    else if (ci.type == 'Fragment') ci.map = 'frags';
    else if (ci.type == 'RGroup') ci.map = 'rgroups';
    else if (ci.type == 'ChiralFlag') ci.map = 'chiralFlags';
    return ci;
};

rnd.Render.prototype.client2Obj = function (clientPos) {
	return new util.Vec2(clientPos).sub(this.offset);
};

rnd.Render.prototype.setMolecule = function (ctab, norescale)
{
	rnd.logMethod("setMolecule");
	this.paper.clear();
	this.ctab = new rnd.ReStruct(ctab, this, norescale);
	this.offset = null;
	this.size = null;
	this.bb = null;
	this.rxnMode = ctab.isReaction;
};

// molecule manipulation interface
rnd.Render.prototype.atomGetAttr = function (aid, name)
{
	rnd.logMethod("atomGetAttr");
	// TODO: check attribute names
	return this.ctab.molecule.atoms.get(aid)[name];
};

rnd.Render.prototype.invalidateAtom = function (aid, level)
{
	var atom = this.ctab.atoms.get(aid);
	this.ctab.markAtom(aid, level ? 1 : 0);
	var hbs = this.ctab.molecule.halfBonds;
	for (var i = 0; i < atom.a.neighbors.length; ++i) {
		var hbid = atom.a.neighbors[i];
		if (hbs.has(hbid)) {
			var hb = hbs.get(hbid);
			this.ctab.markBond(hb.bid, 1);
			this.ctab.markAtom(hb.end, 0);
            if (level)
                this.invalidateLoop(hb.bid);
		}
	}
};

rnd.Render.prototype.invalidateLoop = function (bid)
{
	var bond = this.ctab.bonds.get(bid);
    var lid1 = this.ctab.molecule.halfBonds.get(bond.b.hb1).loop;
    var lid2 = this.ctab.molecule.halfBonds.get(bond.b.hb2).loop;
    if (lid1 >= 0)
        this.ctab.loopRemove(lid1);
    if (lid2 >= 0)
        this.ctab.loopRemove(lid2);
};

rnd.Render.prototype.invalidateBond = function (bid)
{
	var bond = this.ctab.bonds.get(bid);
        this.invalidateLoop(bid);
	this.invalidateAtom(bond.b.begin, 0);
	this.invalidateAtom(bond.b.end, 0);
};

rnd.Render.prototype.invalidateItem = function (map, id, level)
{
	if (map == 'atoms') {
		this.invalidateAtom(id, level);
    } else if (map == 'bonds') {
		this.invalidateBond(id);
        if (level > 0)
            this.invalidateLoop(id);
    } else {
		this.ctab.markItem(map, id, level);
    }
};

rnd.Render.prototype.atomGetDegree = function (aid)
{
	rnd.logMethod("atomGetDegree");
	return this.ctab.atoms.get(aid).a.neighbors.length;
};

rnd.Render.prototype.isBondInRing = function (bid) {
	var bond = this.ctab.bonds.get(bid);
	return this.ctab.molecule.halfBonds.get(bond.b.hb1).loop >= 0 ||
	this.ctab.molecule.halfBonds.get(bond.b.hb2).loop >= 0;
};

rnd.Render.prototype.atomGetNeighbors = function (aid)
{
	var atom = this.ctab.atoms.get(aid);
	var neiAtoms = [];
	for (var i = 0; i < atom.a.neighbors.length; ++i) {
		var hb = this.ctab.molecule.halfBonds.get(atom.a.neighbors[i]);
		neiAtoms.push({
			'aid': hb.end - 0,
			'bid': hb.bid - 0
		});
	}
	return neiAtoms;
};

// returns an array of s-group id's
rnd.Render.prototype.atomGetSGroups = function (aid)
{
	rnd.logMethod("atomGetSGroups");
	var atom = this.ctab.atoms.get(aid);
	return util.Set.list(atom.a.sgs);
};

rnd.Render.prototype.sGroupGetAttr = function (sgid, name)
{
	rnd.logMethod("sGroupGetAttr");
	return this.ctab.sgroups.get(sgid).item.getAttr(name);
};

rnd.Render.prototype.sGroupGetAttrs = function (sgid)
{
	rnd.logMethod("sGroupGetAttrs");
	return this.ctab.sgroups.get(sgid).item.getAttrs();
};

// TODO: move to SGroup
rnd.Render.prototype.sGroupGetAtoms = function (sgid)
{
	rnd.logMethod("sGroupGetAtoms");
	var sg = this.ctab.sgroups.get(sgid).item;
	return chem.SGroup.getAtoms(this.ctab.molecule, sg);
};

rnd.Render.prototype.sGroupGetType = function (sgid)
{
	rnd.logMethod("sGroupGetType");
	var sg = this.ctab.sgroups.get(sgid).item;
	return sg.type;
};

rnd.Render.prototype.sGroupsFindCrossBonds = function ()
{
	rnd.logMethod("sGroupsFindCrossBonds");
	this.ctab.molecule.sGroupsRecalcCrossBonds();
};

// TODO: move to ReStruct
rnd.Render.prototype.sGroupGetNeighborAtoms = function (sgid)
{
	rnd.logMethod("sGroupGetNeighborAtoms");
	var sg = this.ctab.sgroups.get(sgid).item;
	return sg.neiAtoms;
};

// TODO: move to ReStruct
rnd.Render.prototype.atomIsPlainCarbon = function (aid)
{
	rnd.logMethod("atomIsPlainCarbon");
	return this.ctab.atoms.get(aid).a.isPlainCarbon();
};

rnd.Render.prototype.highlightObject = function(obj, visible) {
    if (['atoms', 'bonds', 'rxnArrows', 'rxnPluses', 'chiralFlags', 'frags', 'rgroups', 'sgroups', 'sgroupData'].indexOf(obj.map) > -1) {
        var item = this.ctab[obj.map].get(obj.id);
        if (item == null)
            return true; // TODO: fix, attempt to highlight a deleted item
        if ((obj.map == 'sgroups' && item.item.type == 'DAT') || obj.map == 'sgroupData') {
            // set highlight for both the group and the data item
            var item1 = this.ctab.sgroups.get(obj.id);
            var item2 = this.ctab.sgroupData.get(obj.id);
            if (item1 != null)
                item1.setHighlight(visible, this);
            if (item2 != null)
                item2.setHighlight(visible, this);
        } else {
            item.setHighlight(visible, this);
        }
    } else {
        return false;
    }
    return true;
};

rnd.Render.prototype.itemGetPos = function (map, id)
{
    return this.ctab.molecule[map].get(id).pp;
};

rnd.Render.prototype.atomGetPos = function (id)
{
	rnd.logMethod("atomGetPos");
	return this.itemGetPos('atoms', id);
};

rnd.Render.prototype.rxnArrowGetPos = function (id)
{
	rnd.logMethod("rxnArrowGetPos");
	return this.itemGetPos('rxnArrows', id);
};

rnd.Render.prototype.rxnPlusGetPos = function (id)
{
	rnd.logMethod("rxnPlusGetPos");
	return this.itemGetPos('rxnPluses', id);
};

rnd.Render.prototype.getAdjacentBonds = function (atoms) {
	var aidSet = util.Set.fromList(atoms);
	var bidSetInner = util.Set.empty(), bidSetCross = util.Set.empty();
	for (var i = 0; i < atoms.length; ++i) {
		var aid = atoms[i];
		var atom = this.ctab.atoms.get(aid);
		for (var j = 0; j < atom.a.neighbors.length; ++j) {
			var hbid = atom.a.neighbors[j];
			var hb = this.ctab.molecule.halfBonds.get(hbid);
			var endId = hb.end;
			var set = util.Set.contains(aidSet, endId) ?
				bidSetInner : bidSetCross;
			util.Set.add(set, hb.bid);
		}
	}
	return {'inner': bidSetInner, 'cross': bidSetCross};
};

rnd.Render.prototype.bondGetAttr = function (bid, name)
{
	rnd.logMethod("bondGetAttr");
	return this.ctab.bonds.get(bid).b[name];
};

rnd.Render.prototype.setSelection = function (selection)
{
	rnd.logMethod("setSelection");
	for (var map in rnd.ReStruct.maps) {
        if (!rnd.ReStruct.maps[map].isSelectable())
            continue;
        var set = selection ? (selection[map] ? util.identityMap(selection[map]) : {}) : null;
		this.ctab[map].each(function(id, item){
            var selected = set ? set[id] === id : item.selected;
			item.selected = selected;
			this.ctab.showItemSelection(id, item, selected);
		}, this);
	}
};

rnd.Render.prototype.initStyles = function ()
{
	// TODO move fonts, dashed lines, etc. here
	var settings = this.settings;
	this.styles = {};
	this.styles.lineattr = {
		stroke: '#000',
		'stroke-width': settings.lineWidth,
		'stroke-linecap' : 'round',
		'stroke-linejoin' : 'round'
	};
	this.styles.selectionStyle = {
		'fill':'#7f7',
		'stroke':'none'
	};
	this.styles.selectionZoneStyle = {
		'fill':'#000',
		'stroke':'none',
		'opacity':0.0
	};
	this.styles.highlightStyle = {
		'stroke':'#0c0',
		'stroke-width':0.6*settings.lineWidth
		};
	this.styles.sGroupHighlightStyle = {
		'stroke':'#9900ff',
		'stroke-width':0.6*settings.lineWidth
		};
	this.styles.sgroupBracketStyle = {
		'stroke':'darkgray',
		'stroke-width':0.5*settings.lineWidth
		};
	this.styles.atomSelectionPlateRadius = settings.labelFontSize * 1.2 ;
};

rnd.Render.prototype.initSettings = function()
{
	var settings = this.settings = {};
	settings.delta = this.ctab.molecule.getCoordBoundingBox();
	settings.margin = 0.1;
	settings.scaleFactor = this.scale;
	settings.lineWidth = settings.scaleFactor / 20;
	settings.bondShift = settings.scaleFactor / 6;
	settings.bondSpace = settings.scaleFactor / 7;
	settings.labelFontSize = Math.ceil(1.9 * (settings.scaleFactor / 6)); // TODO: don't round?
	settings.subFontSize = Math.ceil(0.7 * settings.labelFontSize);
	// font size is not determined by the number in this string,
	//  but by the 'font-size' property
	settings.font = '30px "Arial"';
	settings.fontsz = this.settings.labelFontSize;
	settings.fontszsub = this.settings.subFontSize;
	settings.fontRLabel = this.settings.labelFontSize * 1.2;
	settings.fontRLogic = this.settings.labelFontSize * 0.7;
};

rnd.Render.prototype.getStructCenter = function (selection)
{
	var bb = this.ctab.getVBoxObj(selection);
	return util.Vec2.lc2(bb.p0, 0.5, bb.p1, 0.5);
};

rnd.Render.prototype.onResize = function ()
{
	this.setViewSize(new util.Vec2(this.clientArea['clientWidth'], this.clientArea['clientHeight']));
};

rnd.Render.prototype.setViewSize = function (viewSz)
{
     this.viewSz = new util.Vec2(viewSz);
};

rnd.Render.prototype._setPaperSize = function (sz)
{
	var z = this.zoom;
	this.paper.setSize(sz.x * z, sz.y * z);
	this.setViewBox(z);
};

rnd.Render.prototype.setPaperSize = function (sz)
{
	rnd.logMethod("setPaperSize");
	var oldSz = this.sz;
	this.sz = sz;
	this._setPaperSize(sz);
	if (this.onCanvasSizeChanged)
		this.onCanvasSizeChanged(sz, oldSz);
};

rnd.Render.prototype.setOffset = function (offset)
{
	rnd.logMethod("setOffset");
	var oldOffset = this.offset;
	this.offset = offset;
	if (this.onCanvasOffsetChanged) this.onCanvasOffsetChanged(offset, oldOffset);
};

rnd.Render.prototype.getElementPos = function (obj)
{
	var curleft = 0, curtop = 0;

	if (obj.offsetParent) {
		do {
			curleft += obj.offsetLeft;
			curtop += obj.offsetTop;
		} while ((obj = obj.offsetParent));
	}
	return new util.Vec2(curleft,curtop);
};

rnd.Render.prototype.drawSelectionLine = function (p0, p1) {
	rnd.logMethod("drawSelectionLine");
	if (this.selectionRect) {
		this.selectionRect.remove();
	    this.selectionRect = null;
    }
	if (p0 && p1) {
		p0 = this.obj2scaled(p0).add(this.offset);
		p1 = this.obj2scaled(p1).add(this.offset);
		this.selectionRect = this.paper.path(
            rnd.ReStruct.makeStroke(p0, p1)
        ).attr({'stroke':'gray', 'stroke-width':'1px'});
	}
};

rnd.Render.prototype.drawSelectionRectangle = function (p0, p1) {
	rnd.logMethod("drawSelectionRectangle");
	if (this.selectionRect) {
		this.selectionRect.remove();
	    this.selectionRect = null;
    }
	if (p0 && p1) {
		p0 = this.obj2scaled(p0).add(this.offset);
		p1 = this.obj2scaled(p1).add(this.offset);
		this.selectionRect = this.paper.rect(
            Math.min(p0.x, p1.x), Math.min(p0.y, p1.y), Math.abs(p1.x - p0.x), Math.abs(p1.y - p0.y)
        ).attr({'stroke':'gray', 'stroke-width':'1px'});
	}
};

rnd.Render.prototype.getElementsInRectangle = function (p0,p1) {
	rnd.logMethod("getElementsInRectangle");
	var bondList = new Array();
	var atomList = new Array();

	var x0 = Math.min(p0.x, p1.x), x1 = Math.max(p0.x, p1.x), y0 = Math.min(p0.y, p1.y), y1 = Math.max(p0.y, p1.y);
	this.ctab.bonds.each(function (bid, bond){
		var centre = util.Vec2.lc2(this.ctab.atoms.get(bond.b.begin).a.pp, 0.5,
			this.ctab.atoms.get(bond.b.end).a.pp, 0.5);
		if (centre.x > x0 && centre.x < x1 && centre.y > y0 && centre.y < y1)
			bondList.push(bid);
	}, this);
	this.ctab.atoms.each(function(aid, atom) {
		if (atom.a.pp.x > x0 && atom.a.pp.x < x1 && atom.a.pp.y > y0 && atom.a.pp.y < y1)
			atomList.push(aid);
	}, this);
	var rxnArrowsList = new Array();
	var rxnPlusesList = new Array();
	this.ctab.rxnArrows.each(function(id, item){
		if (item.item.pp.x > x0 && item.item.pp.x < x1 && item.item.pp.y > y0 && item.item.pp.y < y1)
			rxnArrowsList.push(id);
	}, this);
	this.ctab.rxnPluses.each(function(id, item){
		if (item.item.pp.x > x0 && item.item.pp.x < x1 && item.item.pp.y > y0 && item.item.pp.y < y1)
			rxnPlusesList.push(id);
	}, this);
	var chiralFlagList = new Array();
	this.ctab.chiralFlags.each(function(id, item){
		if (item.pp.x > x0 && item.pp.x < x1 && item.pp.y > y0 && item.pp.y < y1)
			chiralFlagList.push(id);
	}, this);
	var sgroupDataList = new Array();
	this.ctab.sgroupData.each(function(id, item){
		if (item.sgroup.pp.x > x0 && item.sgroup.pp.x < x1 && item.sgroup.pp.y > y0 && item.sgroup.pp.y < y1)
			sgroupDataList.push(id);
	}, this);
	return {
		'atoms':atomList,
		'bonds':bondList,
		'rxnArrows':rxnArrowsList,
		'rxnPluses':rxnPlusesList,
		'chiralFlags':chiralFlagList,
		'sgroupData':sgroupDataList
	};
};

rnd.Render.prototype.drawSelectionPolygon = function (r) {
	rnd.logMethod("drawSelectionPolygon");
	if (this.selectionRect) {
		this.selectionRect.remove();
	    this.selectionRect = null;
    }
	if (r && r.length > 1) {
		var v = this.obj2scaled(r[r.length - 1]).add(this.offset);
		var pstr = "M" + tfx(v.x) + "," + tfx(v.y);
		for (var i = 0; i < r.length; ++i) {
			v = this.obj2scaled(r[i]).add(this.offset);
			pstr += "L" + tfx(v.x) + "," + tfx(v.y);
		}
		this.selectionRect = this.paper.path(pstr).attr({'stroke':'gray', 'stroke-width':'1px'});
	}
};

rnd.Render.prototype.isPointInPolygon = function (r, p) {
	var d = new util.Vec2(0, 1);
	var n = d.rotate(Math.PI/2);
	var v0 = util.Vec2.diff(r[r.length - 1], p);
	var n0 = util.Vec2.dot(n, v0);
	var d0 = util.Vec2.dot(d, v0);
	var w0 = null;
	var counter = 0;
	var eps = 1e-5;
	var flag1 = false, flag0 = false;

	for (var i = 0; i < r.length; ++i) {
		var v1 = util.Vec2.diff(r[i], p);
		var w1 = util.Vec2.diff(v1, v0);
		var n1 = util.Vec2.dot(n, v1);
		var d1 = util.Vec2.dot(d, v1);
		flag1 = false;
		if (n1 * n0 < 0)
		{
			if (d1 * d0 > -eps) {
				if (d0 > -eps)
					flag1 = true;
			} else if ((Math.abs(n0) * Math.abs(d1) - Math.abs(n1) * Math.abs(d0)) * d1 > 0) {
				flag1 = true;
			}
		}
		if (flag1 && flag0 && util.Vec2.dot(w1, n) * util.Vec2(w0, n) >= 0)
			flag1 = false;
		if (flag1)
			counter++;
		v0 = v1;
		n0 = n1;
		d0 = d1;
		w0 = w1;
		flag0 = flag1;
	}
	return (counter % 2) != 0;
};

rnd.Render.prototype.ps = function (pp) {
    return pp.scaled(this.settings.scaleFactor);
};

rnd.Render.prototype.getElementsInPolygon = function (rr) {
	rnd.logMethod("getElementsInPolygon");
	var bondList = new Array();
	var atomList = new Array();
	var r = [];
	for (var i = 0; i < rr.length; ++i) {
		r[i] = new util.Vec2(rr[i].x, rr[i].y);
	}
	this.ctab.bonds.each(function (bid, bond){
		var centre = util.Vec2.lc2(this.ctab.atoms.get(bond.b.begin).a.pp, 0.5,
			this.ctab.atoms.get(bond.b.end).a.pp, 0.5);
		if (this.isPointInPolygon(r, centre))
			bondList.push(bid);
	}, this);
	this.ctab.atoms.each(function(aid, atom){
		if (this.isPointInPolygon(r, atom.a.pp))
			atomList.push(aid);
	}, this);
	var rxnArrowsList = new Array();
	var rxnPlusesList = new Array();
	this.ctab.rxnArrows.each(function(id, item){
		if (this.isPointInPolygon(r, item.item.pp))
			rxnArrowsList.push(id);
	}, this);
	this.ctab.rxnPluses.each(function(id, item){
		if (this.isPointInPolygon(r, item.item.pp))
			rxnPlusesList.push(id);
	}, this);
	var chiralFlagList = new Array();
	this.ctab.chiralFlags.each(function(id, item){
		if (this.isPointInPolygon(r, item.pp))
			chiralFlagList.push(id);
	}, this);
	var sgroupDataList = new Array();
	this.ctab.sgroupData.each(function(id, item){
		if (this.isPointInPolygon(r, item.sgroup.pp))
			sgroupDataList.push(id);
	}, this);

	return {
		'atoms':atomList,
		'bonds':bondList,
		'rxnArrows':rxnArrowsList,
		'rxnPluses':rxnPlusesList,
		'chiralFlags':chiralFlagList,
		'sgroupData':sgroupDataList
	};
};

rnd.Render.prototype.testPolygon = function (rr) {
	rr = rr || [
	{
		x:50,
		y:10
	},

	{
		x:20,
		y:90
	},

	{
		x:90,
		y:30
	},

	{
		x:10,
		y:30
	},

	{
		x:90,
		y:80
	}
	];
	if (rr.length < 3)
		return;
	var min = rr[0], max = rr[0];
	for (var j = 1; j < rr.length; ++j) {
		min = util.Vec2.min(min, rr[j]);
		max = util.Vec2.max(max, rr[j]);
	}
	this.drawSelectionPolygon(rr);
	for (var k = 0; k < 1000; ++k) {
		var p = new util.Vec2(Math.random() * zz, Math.random() * zz);
		var isin = this.isPointInPolygon(rr, p);
		var color = isin ? '#0f0' : '#f00';
		this.paper.circle(p.x, p.y, 2).attr({
			'fill':color,
			'stroke':'none'
		});
	}
	this.drawSelectionPolygon(rr);
};

rnd.Render.prototype.update = function (force)
{
	rnd.logMethod("update");

	if (!this.settings || this.dirty) {
		if (this.opt.autoScale)
		{
			var cbb = this.ctab.molecule.getCoordBoundingBox();
			// this is only an approximation to select some scale that's close enough to the target one
			var sy = cbb.max.y - cbb.min.y > 0 ? 0.8*this.viewSz.y / (cbb.max.y - cbb.min.y) : 100;
			var sx = cbb.max.x - cbb.min.x > 0 ? 0.8*this.viewSz.x / (cbb.max.x - cbb.min.x) : 100;
			this.scale = Math.min(sy, sx);
		}
		this.initSettings();
		this.initStyles();
		this.dirty = false;
		force = true;
	}

	var start = (new Date).getTime();
	var changes = this.ctab.update(force);
    this.setSelection(null); // [MK] redraw the selection bits where necessary
	var time = (new Date).getTime() - start;
	if (force && $('log'))
		$('log').innerHTML = time.toString() + '\n';
	if (changes) {
		var sf = this.settings.scaleFactor;
		var bb = this.ctab.getVBoxObj().transform(this.obj2scaled, this).translate(this.offset || new util.Vec2());

		if (!this.opt.autoScale) {
			var ext = util.Vec2.UNIT.scaled(sf);
			bb = bb.extend(ext, ext);
			if (!this.bb)
                            this.bb = new util.Box2Abs(util.Vec2.ZERO, this.viewSz);
                        this.bb = util.Box2Abs.union(this.bb, bb);
			bb = this.bb.clone();

			var sz = util.Vec2.max(bb.sz().floor(), this.viewSz);
			var offset = bb.p0.negated().ceil();
			if (!this.sz || sz.x > this.sz.x || sz.y > this.sz.y)
				this.setPaperSize(sz);

			var oldOffset = this.offset || new util.Vec2();
			var delta = offset.sub(oldOffset);
			if (!this.offset || delta.x > 0 || delta.y > 0) {
				this.setOffset(offset);
				this.ctab.translate(delta);
				this.bb.translate(delta);
			}
		} else {
			var sz1 = bb.sz();
			var marg = this.opt.autoScaleMargin;
            var mv = new util.Vec2(marg, marg);
			var csz = this.viewSz;
			if (csz.x < 2*marg+1 || csz.y < 2*marg+1)
				throw new Error("View box too small for the given margin");
            var rescale = Math.max(sz1.x/(csz.x-2*marg), sz1.y/(csz.y-2*marg));
            var sz2 = sz1.add(mv.scaled(2*rescale));
            this.paper.setViewBox(bb.pos().x-marg*rescale-(csz.x*rescale-sz2.x)/2, bb.pos().y-marg*rescale-(csz.y*rescale-sz2.y)/2, csz.x*rescale, csz.y*rescale);
		}
	}
	
	// Code inserted by KNIME AG to bubble up the moleculeChange event to the Quickform.
	/*if (parent && parent.SketchTranslator) {
		parent.SketchTranslator.moleculeChange();
	}*/
};

rnd.Render.prototype.checkBondExists = function (begin, end) {
	return this.ctab.molecule.checkBondExists(begin, end);
};

rnd.Render.prototype.findClosestAtom = function (pos, minDist, skip) { // TODO should be a member of ReAtom (see ReFrag)
	var closestAtom = null;
	var maxMinDist = this.opt.selectionDistanceCoefficient;
	minDist = minDist || maxMinDist;
	minDist	= Math.min(minDist, maxMinDist);
	this.ctab.atoms.each(function(aid, atom){
        if (aid != skip) {
            var dist = util.Vec2.dist(pos, atom.a.pp);
            if (dist < minDist) {
                closestAtom = aid;
                minDist = dist;
            }
        }
	}, this);
	if (closestAtom != null)
		return {
			'id':closestAtom,
			'dist':minDist
		};
	return null;
};

rnd.Render.prototype.findClosestBond = function (pos, minDist) { // TODO should be a member of ReBond (see ReFrag)
	var closestBond = null;
	var closestBondCenter = null;
	var maxMinDist = this.opt.selectionDistanceCoefficient;
	minDist = minDist || maxMinDist;
	minDist = Math.min(minDist, maxMinDist);
	var minCDist = minDist;
	this.ctab.bonds.each(function(bid, bond){
		var p1 = this.ctab.atoms.get(bond.b.begin).a.pp,
		p2 = this.ctab.atoms.get(bond.b.end).a.pp;
		var mid = util.Vec2.lc2(p1, 0.5, p2, 0.5);
		var cdist = util.Vec2.dist(pos, mid);
		if (cdist < minCDist) {
		    minCDist = cdist;
		    closestBondCenter = bid;
		}
	}, this);
	this.ctab.bonds.each(function(bid, bond){
		var hb = this.ctab.molecule.halfBonds.get(bond.b.hb1);
		var d = hb.dir;
		var n = hb.norm;
		var p1 = this.ctab.atoms.get(bond.b.begin).a.pp,
		p2 = this.ctab.atoms.get(bond.b.end).a.pp;

		var inStripe = util.Vec2.dot(pos.sub(p1),d) * util.Vec2.dot(pos.sub(p2),d) < 0;
		if (inStripe) {
			var dist = Math.abs(util.Vec2.dot(pos.sub(p1),n));
			if (dist < minDist) {
				closestBond = bid;
				minDist = dist;
			}
		}
	}, this);
	if (closestBond !== null || closestBondCenter !== null)
		return {
			'id': closestBond,
			'dist': minDist,
			'cid': closestBondCenter,
			'cdist': minCDist
		};
	return null;
};

rnd.Render.prototype.findClosestItem = function (pos, maps, skip) {
	var ret = null;
	var updret = function(type, item, force) {
		if (item != null && (ret == null || ret.dist > item.dist || force)) {
			ret = {
				'type':type,
				'id':item.id,
				'dist':item.dist
			};
		}
	};

    // TODO make it "map-independent", each object should be able to "report" its distance to point (something like ReAtom.dist(point))
    if (!maps || maps.indexOf('atoms') >= 0) {
        var atom = this.findClosestAtom(
            pos, undefined, !Object.isUndefined(skip) && skip.map == 'atoms' ? skip.id : undefined
        );
        updret('Atom', atom);
    }
    if (!maps || maps.indexOf('bonds') >= 0) {
        var bond = this.findClosestBond(pos);
	if (bond) {
	    if (bond.cid !== null)
		updret('Bond', {'id': bond.cid, 'dist': bond.cdist});
	    if (ret == null || ret.dist > 0.4 * this.scale) // hack
		updret('Bond', bond);
	}
    }
    if (!maps || maps.indexOf('chiralFlags') >= 0) {
        var flag = rnd.ReChiralFlag.findClosest(this, pos);
        updret('ChiralFlag', flag); // [MK] TODO: replace this with map name, 'ChiralFlag' -> 'chiralFlags', to avoid the extra mapping "if (ci.type == 'ChiralFlag') ci.map = 'chiralFlags';"
    }
    if (!maps || maps.indexOf('sgroupData') >= 0) {
        var sgd = rnd.ReDataSGroupData.findClosest(this, pos);
        updret('DataSGroupData', sgd);
    }
    if (!maps || maps.indexOf('sgroups') >= 0) {
        var sg = rnd.ReSGroup.findClosest(this, pos);
        updret('SGroup', sg);
    }
    if (!maps || maps.indexOf('rxnArrows') >= 0) {
        var arrow = rnd.ReRxnArrow.findClosest(this, pos);
        updret('RxnArrow',arrow);
    }
    if (!maps || maps.indexOf('rxnPluses') >= 0) {
        var plus = rnd.ReRxnPlus.findClosest(this, pos);
        updret('RxnPlus',plus);
    }
    if (!maps || maps.indexOf('frags') >= 0) {
        var frag = rnd.ReFrag.findClosest(this, pos, skip && skip.map == 'atoms' ? skip.id : undefined);
        updret('Fragment', frag);
    }
    if (!maps || maps.indexOf('rgroups') >= 0) {
        var rgroup = rnd.ReRGroup.findClosest(this, pos);
        updret('RGroup', rgroup);
    }

	ret = ret || {
		'type':'Canvas',
		'id':-1
	};
	return ret;
};

rnd.Render.prototype.setZoom = function (zoom) {
	this.zoom = zoom;
	this._setPaperSize(this.sz);
};

rnd.Render.prototype.extendCanvas = function (x0, y0, x1, y1) {
	var ex = 0, ey = 0, dx = 0, dy = 0;
	x0 = x0-0;
	x1 = x1-0;
	y0 = y0-0;
	y1 = y1-0;

	if (x0 < 0) {
		ex += -x0;
		dx += -x0;
	}
	if (y0 < 0) {
		ey += -y0;
		dy += -y0;
	}

	var szx = this.sz.x * this.zoom, szy = this.sz.y * this.zoom;
	if (szx < x1) {
		ex += x1 - szx;
	}
	if (szy < y1) {
		ey += y1 - szy;
	}

	var d = new util.Vec2(dx, dy).scaled(1 / this.zoom);
	if (ey > 0 || ex > 0) {
		var e = new util.Vec2(ex, ey).scaled(1 / this.zoom);
		var sz = this.sz.add(e);

		this.setPaperSize(sz);
		if (d.x > 0 || d.y > 0) {
			this.setOffset(this.offset.add(d));
			this.ctab.translate(d);
			this.bb.translate(d);
		}
	}
	return d;
};

rnd.Render.prototype.setScale = function (z) {
	if (this.offset)
		this.offset = this.offset.scaled(1/z).scaled(this.zoom);
	this.scale = this.baseScale * this.zoom;
	this.settings = null;
	this.update(true);
};

rnd.Render.prototype.setViewBox = function (z) {
	if (!this.useOldZoom)
		this.paper.canvas.setAttribute("viewBox",'0 0 ' + this.sz.x + ' ' + this.sz.y);
	else
		this.setScale(z);
};
