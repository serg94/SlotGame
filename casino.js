var SlotGame = {
    canvas: null,
    canvasCtx: null,
    ctx: null,
    slotUrls: ['7', 'bar', 'cherry', 'lemon', 'scatter'],
    slots: [],
    imageMatrix: null,

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
    incrementRangeTop: 0.25,
    incrementRangeBottom: 0.15,
    maxVelocities: [],
    maxVelocityRangeTop: 35,
    maxVelocityRangeBottom: 25,

    deltaTops: [],

    init: function () {
        this._loadSlotImages(function () {
            this.ready = true;
            this._bindDOMEvents();
            this._initContext();
            this._initDrawingData();
        }.bind(this));
    },

    _slot: function () {
        if (!this.ready || this.slotInProgress) return;
        this._initSlotLoopData();
        this.slotInProgress = true;
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
        console.log("ended");
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
                this._drawColumn(ctx, height, i); // if motion not exists move into block above
            } else {
                this._drawColumn(ctx, height, i, true); // if motion not exists move into block above
            }
        }

        this.canvasCtx.clearRect(0, 0, width, height);
        this.canvasCtx.drawImage(ctx.canvas, 0, height / 5, width, height * 3 / 5,
            this.deltaX, this.deltaY, width, height * 3 / 5);

        mustRedraw ? window.requestAnimationFrame(this._draw) : this._ended();
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

        this._draw = this._draw.bind(this, ctx, width, height);
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