HTMLElement.prototype.show = function () {
    this.style.display = 'block'
};

HTMLElement.prototype.hide = function () {
    this.style.display = 'none'
};

var Util = {
    attachFont: function(){
        var css, head, style,
            url = ( window.location.protocol == "https:" ) ? 'https://aarkispire-a.akamaihd.net' : 'http://spire.aarki.net';
        url += '/builds/spear/common/fonts/puma/';

        url = "res/font/halo.regular.ttf";

        //initing some styles and fonts
        css = '@font-face {font-family: halo;' +
                'src: url("'+ url + '");';

        head = document.head || document.getElementsByTagName('head')[0];
        style = document.createElement('style');
        style.type = 'text/css';

        if (style.styleSheet) {
            style.styleSheet.cssText = css;
        } else {
            style.appendChild(document.createTextNode(css));
        }
        head.appendChild(style);
    }
};

var SlotGame = {
    canvas: null,
    canvasCtx: null,
    ctx: null,
    slotUrls: ['7', 'bar', 'cherry', 'lemon', 'scatter'],
    slots: [],
    imageMatrix: null,
    spinsCount: 10,

    velocityRange: [0.2, 0.6],
    velocityCoefficient: 1, // [0, 10]
    maxVelocityRange: [40, 80],

    ready: false,
    slotInProgress: false,

    width: 0,
    height: 0,
    marginVertical: 0.05,
    marginHorizontal: 0.022,
    slotWidth: 0,
    slotHeight: 0,

    velocities: [],
    velocityRangeTop: 0.1,
    velocityRangeBottom: 0.05,
    increments: [],
    incrementRangeTop: 0.30,
    incrementRangeBottom: 0.20,
    maxVelocities: [],
    maxVelocityRangeTop: 40,
    maxVelocityRangeBottom: 25,

    deltaTops: [],

    spinsLeftElem: null,
    jackpotElem: null,
    winScoreElem: null,
    timeLeftElem: null,

    init: function () {
        Util.attachFont();
        this._loadSlotImages(function () {
            this.ready = true;
            this._bindDOMEvents();
            this._initContext();
            this._initDrawingData();
            this._drawBoard();
        }.bind(this));
    },

    _slot: function () {
        if (!this.ready || this.slotInProgress) return;
        this._initSlotLoopData();
        this.slotInProgress = true;
        this.jackpotElem.hide();
        this.spinsCount--;
        this._setSpinsCount();
        window.requestAnimationFrame(this._draw);
    },

    _initSlotLoopData: function () {
        this.deltaTops = [];
        this.velocities = [];
        this.increments = [];
        this.maxVelocities = [];

        for (var i = 0; i < 5; i++) {
            this.velocities.push(0);
            this.deltaTops.push(0);
            var randomIncrement = this._getRandomInRange(this.incrementRangeBottom, this.incrementRangeTop);
            this.increments.push(randomIncrement);
            var randomMaxVelocity = this._getRandomInRange(this.maxVelocityRangeBottom, this.maxVelocityRangeTop);
            this.maxVelocities.push(randomMaxVelocity);
        }
    },

    _updateSlotsMatrixColumn: function (columnIndex) {
        var column = this.imageMatrix[columnIndex];
        column.pop();
        column.unshift(this._getRandomImage());
    },

    _ended: function () {
        this.slotInProgress = false;
        this._handleExit();
        if (this.spinsCount <= 0) {
            this._spinsCountEnded();
        }
        console.log("Spin Ended");
    },

    _spinsCountEnded: function () {
        console.log('Game Over');
    },

    _handleExit: function () {
        var winningRow = this.imageMatrix.map(function (column) {
            return column[2];
        });

        for (var i = 1; i < winningRow.length; i++) if (winningRow[i] != winningRow[i - 1]) {
            return false;
        }

        this.jackpotElem.show();
    },

    _setSpinsCount: function () {
        this.spinsLeftElem.innerHTML = 'spins left: ' + this.spinsCount;
    },

    _getRandomInRange: function (min, max) {
        return Math.random() * (max - min) + min;
    },

    // this and arguments bounded
    _draw: function (ctx, width, height) {
        var mustRedraw = false;

        for (var i = 0; i < 5; i++) {
            if (this.increments[i] > 0) {
                this.velocities[i] += 2 * this.increments[i];
            } else {
                this.velocities[i] += this.increments[i];
            }

            if (this.velocities[i] >= 0) {
                this.deltaTops[i] += this.velocities[i];
            }

            if (this.deltaTops[i] >= this.slotHeight) {
                this.deltaTops[i] -= this.slotHeight;
                this._updateSlotsMatrixColumn(i);
            }

            if (this.velocities[i] > this.maxVelocities[i]) {
                this.increments[i] = -Math.abs(this.increments[i]); // can use easing with 2 quadratic polynomials
            }

            if (this.velocities[i] < 0) {
                this.deltaTops[i] = Math.max(0, this.deltaTops[i] - Math.abs(this.velocities[i]));
            }

            if (this.velocities[i] > 0 || this.deltaTops[i] != 0) {
                mustRedraw = true;
                this._drawColumn(ctx, height, i);
            } else {
                this._drawColumn(ctx, height, i, true); // draw without motion as it stopped
            }
        }

        this._drawCanvasOnCanvas(ctx, width, height);

        mustRedraw ? window.requestAnimationFrame(this._draw) : this._ended();
    },

    _drawCanvasOnCanvas: function (ctx, width, height) {
        width = Math.min(width, ctx.canvas.width); // fix for Safari and FF
        this.canvasCtx.clearRect(0, 0, width, height);
        this.canvasCtx.drawImage(ctx.canvas, 0, height / 5, width, height * 3 / 5,
            this.deltaX, this.deltaY, width, height * 3 / 5);
    },

    _drawBoard: function (ctx, width, height) {
        this._initSlotLoopData();
        for (var i = 0; i < 5; i++) {
            this._drawColumn(ctx, height, i, true)
        }
        this._drawCanvasOnCanvas(ctx, width, height);
    },

    _drawColumn: function (ctx, height, i, withoutMotion) {
        ctx.clearRect(i * this.slotWidth, 0, this.slotWidth, height);

        if (!withoutMotion) {
            ctx.globalAlpha = 0.11; // motion step opacity
            ctx.drawImage(this.canvas, this.deltaX, this.deltaY, this.width, this.height,
                0, height / 5, this.width, height * 3 / 5);
            ctx.globalAlpha = 1;
        }

        for (var j = 0; j < 5; j++) {
            this._drawSlot(i, j)
        }
    },

    _drawSlot: function (i, j) {
        var img = this.imageMatrix[i][j];
        var delta = this._fitImageInSlot(img);
        var deltaW = delta.deltaW;
        var deltaH = delta.deltaH;

        var x = i * this.slotWidth + deltaW / 2;
        var y = j * this.slotHeight + deltaH / 2 + this.deltaTops[i];
        var width = this.slotWidth - deltaW;
        var height = this.slotHeight - deltaH;

        var scaleSlot = 0.75;

        x += (1 - scaleSlot) * width / 2;
        y += (1 - scaleSlot) * height / 2;

        width *= scaleSlot;
        height *= scaleSlot;

        this.ctx.drawImage(this.imageMatrix[i][j], x, y, width, height);
    },

    _fitImageInSlot: function (img) {
        var imgRatio = img.naturalWidth / img.naturalHeight;
        var slotRatio = this.slotWidth / this.slotHeight;
        var ratioRatio = imgRatio / slotRatio;
        var deltaW = 0, deltaH = 0;

        if (imgRatio > slotRatio) {
            deltaH = this.slotHeight * (ratioRatio - 1)
        } else {
            deltaW = this.slotWidth * (1 - ratioRatio)
        }

        return {
            deltaW: deltaW,
            deltaH: deltaH
        }
    },

    _initContext: function () {
        var canvas = this.canvas = document.getElementById('game');
        var canvasCtx = this.canvasCtx = canvas.getContext('2d');

        this.width = canvasCtx.width = canvas.width = canvas.clientWidth * window.devicePixelRatio;
        this.height = canvasCtx.height = canvas.height = canvas.clientHeight * window.devicePixelRatio;

        this.deltaX = this.width * this.marginHorizontal;
        this.deltaY = this.height * this.marginVertical;

        this.width -= 2 * this.deltaX;
        this.height -= 2 * this.deltaY;

        var c = document.createElement('canvas');
        var ctx = this.ctx = c.getContext('2d');
        var width = ctx.width = c.width = this.width;
        var height = ctx.height = c.height = 5 / 3 * this.height;

        this.slotWidth = width / 5;
        this.slotHeight = height / 5;

        var min = this.velocityRange[0];
        var max = this.velocityRange[1];
        this.incrementRangeTop = min + (max - min) * this.velocityCoefficient / 10;
        this.incrementRangeBottom = this.incrementRangeTop * 0.6;

        min = this.maxVelocityRange[0];
        max = this.maxVelocityRange[1];
        this.maxVelocityRangeTop = min + (max - min) * this.velocityCoefficient / 10;
        this.maxVelocityRangeBottom = this.maxVelocityRangeTop * 0.6;

        this._draw = this._draw.bind(this, ctx, width, height);
        this._drawBoard = this._drawBoard.bind(this, ctx, width, height);

        this.spinsLeftElem = document.getElementById('spins_left');
        this.jackpotElem = document.getElementById('slot_jackpot');
        this.winScoreElem = document.getElementById('slot_win');
        this.timeLeftElem = document.getElementById('slot_time_left');

        this._setSpinsCount();
    },

    _initDrawingData: function () {
        this.imageMatrix = [];
        for (var i = 0; i < 5; i++) {
            var column = this.imageMatrix[i] = [];
            for (var j = 0; j < 5; j++) {
                column.push(this._getRandomImage())
            }
        }
    },

    _getRandomImage: function () {
        var index = Math.floor(Math.random() * this.slots.length);
        return this.slots[index];
    },

    _bindDOMEvents: function () {
        var playBtn = document.getElementById("slot_play");
        playBtn.addEventListener('click', this._slot.bind(this))
    },

    _loadSlotImages: function (cb) {
        var remainingCount = this.slotUrls.length;
        var slotsCount = remainingCount;

        var load = function () {
            if (--remainingCount <= 0) {
                cb()
            }
        };

        var error = function (e) {
            console.log(e)
        };

        while (slotsCount) {
            var img = new Image();
            img.onload = load;
            img.onerror = error;
            img.src = ['res/slots/', this.slotUrls[slotsCount - 1], '.png'].join('');
            this.slots.push(img);
            slotsCount--;
        }
    }
};

function startGame() {
    SlotGame.init()
}

window.addEventListener('load', startGame);