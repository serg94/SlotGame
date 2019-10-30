var SlotGame = {
    canvas: null,
    canvasCtx: null,
    ctx: null,
    itemUrls: [],
    scores: [],
    probabilities: [],
    imageIndexArray: null,
    slots: [],
    playButtonUrl: null,
    playButtonImage: null,
    bgUrl: null,
    bgImage: null,
    imageMatrix: null,
    columnCount: 5,
    spinsCount: 10,
    gameTime: 15, // seconds
    timeLeft: 15, // seconds
    countDownStartDate: null,
    countDownInterval: -1,
    winScore: 0,

    velocityRange: [ 0.2, 0.6 ],
    velocityCoefficient: 1, // [0, 10]
    maxVelocityRange: [ 40, 80 ],

    ready: false,
    slotInProgress: false,
    countDownInProgress: false,

    width: 0,   // this is canvas width height, not a widget width, for widget width use this.width()
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
    playBtn: null,

    canvasBgs: {
        3: 'res/bg/3_slot_machine.png',
        4: 'res/bg/4_slot_machine.png',
        5: 'res/bg/Slot_machine.png'
    },
    canvasBgUrl: null,
    canvasBgImg: null,
    _scoreView: 0, // This is for global score widget

    init: function () {
        if (bowser.android) {
            this._androidChrome = bowser.chrome;
            this._badAndroid = bowser.version < 33; // looks this is fixed version
        }

        this._isDevice = bowser.mobile || bowser.tablet;
    },

    initWidgetFromJson: function (json) {
        this.velocityCoefficient = json['speed'];
        this.spinsCount = json['totalSpins'];
        this.timeLeft = this.gameTime = json['gameTime'];
        this.columnCount = json['columns'];
        this.bgUrl = json['bg']['url'];
        this.canvasBgUrl = this.canvasBgs[this.columnCount];

        json.slot_items.forEach(function (w) {
            this.scores.push(w.score);
            this.probabilities.push(w.probability);
            this.itemUrls.push('res/slots/' + w.url);
        }.bind(this));

        this.playButtonUrl = json.play_button.url;

        this.resultPath = (json.resultPath || '').split(''); // e.g. 'WWL'
        this.randomSpinWinProbability = (json.randomSpinWinProbability || 0) / 100;
    },

    renderView: function (parent_dom) {
        parent_dom.innerHTML = '\
            <div class="slot_game">\
                <div class="slot_logo"></div>\
                <span class="slot_time_left">00:15</span>\
                <span class="spins_left">SPINS: 10</span>\
                <canvas></canvas>\
                <div class="slot_jackpot"></div>\
                <div class="slot_play"></div>\
                <span class="slot_win">WIN: 1,000,000</span>\
            </div>\
        ';

        var dom = this.dom = parent_dom.querySelector('.slot_game');
        this.canvas = dom.querySelector('canvas');
        this.spinsLeftElem = dom.querySelector('.spins_left');
        this.jackpotElem = dom.querySelector('.slot_jackpot');
        this.winScoreElem = dom.querySelector('.slot_win');
        this.timeLeftElem = dom.querySelector('.slot_time_left');
        this.playBtn = dom.querySelector('.slot_play');

        this._setSpinsCount();
        this._setTimeInFormat();
        this._setWinScore();
    },

    loadCreativeView: function (cb) {
        cb = typeof cb == 'function' ? cb : function() {};

        var urls = this.itemUrls.concat([ this.playButtonUrl, this.bgUrl, this.canvasBgUrl ]);
        Util.loadImages(urls, function (images) {
            this.canvasBgImg = images.pop();
            this.bgImage = images.pop();
            this.playButtonImage = images.pop();
            this._init_(images);
            cb();
        }.bind(this), cb);
    },

    _initAndDraw: function () {
        if (this.ready && !this._alreadyItialised) {
            this._bindDOMEvents();
            this._initContext();
            this._drawBoard();
            this._alreadyItialised = true;
        }
    },

    _init_: function (images) {
        this.ready = true;
        this.slots = images;

        var indexArray = this.imageIndexArray = [];
        this.probabilities.forEach(function (p, index) {
            while (--p >= 0) { indexArray.push(index) }
        });

        this._initHtmlContent();
        this._initDrawingData();
        this._initAndDraw();
    },

    _slot: function () {
        if (!this.ready || this.slotInProgress || this.spinsCount <= 0 ||
            this.timeLeft <= 0 || this.slots.length === 0) return;

        var result = this.resultPath.shift();

        if (!result) {
            if (this.randomSpinWinProbability) {
                result = Math.random() < this.randomSpinWinProbability ? 'W' : 'L';
                console.log('You are gonna ', result === 'W' ? 'WIN' : 'Lose');
            } else {
                result = 'R';
            }
        }

        if (result === 'W') { // win
            this.winItemImg = this._getRandomImage();
        } else if (result === 'L') { // lose
            //
        }

        this._currentSlotResult = result;
        this._initSlotLoopData();
        this.slotInProgress = true;
        this.jackpotElem.hide();
        this.spinsCount--;
        this._setSpinsCount();
        this._startCountDown();
        this._gameStart();
        this._draw();
    },

    _gameStart: function () {
        if (!this._gameStartFired) {
            this._gameStartFired = true;
        }
    },

    _startCountDown: function () {
        if (this.countDownInProgress) return;
        this.countDownInProgress = true;
        this.countDownStartDate = new Date();
        this.countDownInterval = window.setInterval(this._updateTime.bind(this), 1000);
    },

    _updateTime: function () {
        this.timeLeft = this.gameTime - Math.floor((new Date() - this.countDownStartDate) / 1000);
        if (this.timeLeft >= 0) {
            this._setTimeInFormat();
        } else {
            window.clearInterval(this.countDownInterval);
            this._timeLeft();
        }
    },

    _setTimeInFormat: function () {
        var minute = (this.timeLeft / 60) | 0;
        var second = (this.timeLeft % 60);

        minute = minute < 10 ? '0' + minute : minute;
        second = second < 10 ? '0' + second : second;

        this.timeLeftElem.innerHTML =  minute + ':' + second;
    },

    _timeLeft: function () {
        //
    },

    _initSlotLoopData: function () {
        this.deltaTops = [];
        this.velocities = [];
        this.increments = [];
        this.maxVelocities = [];

        for (var i = 0; i < this.columnCount; i++) {
            this.velocities.push(0);
            this.deltaTops.push(0);
            var randomIncrement = this._getRandomInRange(this.incrementRangeBottom, this.incrementRangeTop);
            this.increments.push(randomIncrement);
            var randomMaxVelocity = this._getRandomInRange(this.maxVelocityRangeBottom, this.maxVelocityRangeTop);
            this.maxVelocities.push(randomMaxVelocity);
        }

        // velocity increments count before start decreasing
        var possibleIncCounts = this.increments.map(function (inc, i) { return this.maxVelocities[i] / inc; }, this);
        var possibleIncCountsSorted = possibleIncCounts.slice().sort(function(a, b) { return a - b; });

        // map items in order of spin stopping
        // [ 2, 0, 1 ] means 2-th column will stop spinning first, then 0-th will stop, then 1-th
        this.speedMap = possibleIncCountsSorted.map(function (v) {
            return possibleIncCounts.indexOf(v);
        }, this);
    },

    _updateSlotsMatrixColumn: function (columnIndex, result) {
        var column = this.imageMatrix[columnIndex];
        column.pop();
        var img = this._getRandomImage();

        switch (result) {
            case 'W':
                img = this.winItemImg;
                break;
            case 'L':
                while (img === this.firstStoppedItem) {
                    img = this._getRandomImage();
                }
                break;
            default:
                break;
        }

        column.unshift(img);
    },

    _ended: function () {
        this.slotInProgress = false;
        this._handleExit();
        if (this.spinsCount <= 0) {
            this._spinsCountEnded();
        }
    },

    _spinsCountEnded: function () {
        //
    },

    _handleExit: function () {
        var winningRow = this.imageMatrix.map(function (column) {
            return column[2];
        });

        var item = winningRow[0];

        for (var i = 1; i < winningRow.length; i++) {
            if (winningRow[i] !== item) return false;
        }

        var itemIndex = this.slots.indexOf(item);
        this.winScore += this.scores[itemIndex];
        this._setWinScore();
        this.jackpotElem.show();
    },

    _setSpinsCount: function () {
        this.spinsLeftElem.innerHTML = 'SPINS: ' + this.spinsCount;
    },

    _setWinScore: function () {
        this.winScoreElem.innerHTML = 'WIN: ' + this.winScore;
    },

    _getRandomInRange: function (min, max) {
        return Math.random() * (max - min) + min;
    },

    _estimatedItemsMoveCount: function (velocity, increment, initDelta) {
        if (!increment) return 0;

        velocity = Math.abs(velocity);
        increment = Math.abs(increment);

        while (velocity > 0) {
            velocity -= increment;
            initDelta += velocity;
        }

        return Math.floor(initDelta / this.slotHeight);
    },

    // this and arguments bounded
    _draw: function () {
        this._frameStartTime = Date.now();

        var ctx = this.ctx;
        var width = this.width;
        var height = 5 / 3 * this.height;
        var mustRedraw = false;

        for (var j = 0; j < this.columnCount; j++) {
            // handle from fastest to slowest, first stopping column should be handles first
            var i = this.speedMap[j];

            if (this.increments[i] > 0) { // very simple easing
                this.velocities[i] += 2 * this.increments[i];
            } else {
                this.velocities[i] += this.increments[i];
            }

            if (this.velocities[i] >= 0) {
                this.deltaTops[i] += this.velocities[i];
            }

            if (this.velocities[i] > this.maxVelocities[i]) {
                this.increments[i] = -Math.abs(this.increments[i]);
            }

            while (this.deltaTops[i] >= this.slotHeight) {
                this.deltaTops[i] -= this.slotHeight;
                if (
                    this._currentSlotResult === 'W' &&
                    this.increments[i] < 0 &&
                    this._estimatedItemsMoveCount(this.velocities[i], this.increments[i], this.deltaTops[i]) === 2
                ) {
                    this._updateSlotsMatrixColumn(i, 'W');
                } else if (
                    this._currentSlotResult === 'L' &&
                    this.increments[i] < 0 &&
                    j === this.columnCount - 1 && // last and fastest animating item
                    this._estimatedItemsMoveCount(this.velocities[i], this.increments[i], this.deltaTops[i]) === 2
                ) {
                    var k = this.speedMap[0]; // fastest item, or first to be stopped
                    var prevEstimates = this._estimatedItemsMoveCount(this.velocities[k], this.increments[k], this.deltaTops[k]);

                    // finds the first stopping column central img, and takes previous with favor of new items adding count
                    this.firstStoppedItem = this.imageMatrix[k][2 - prevEstimates];

                    this._updateSlotsMatrixColumn(i, 'L');
                } else {
                    this._updateSlotsMatrixColumn(i);
                }
            }

            if (this.velocities[i] < 0) {
                this.deltaTops[i] = Math.max(0, this.deltaTops[i] - Math.abs(this.velocities[i]));
            }

            if (this.velocities[i] > 0 || this.deltaTops[i] !== 0) {
                mustRedraw = true;
                this._drawColumn(ctx, height, i);
            } else {
                this.velocities[i] = this.increments[i] = 0;
                this._drawColumn(ctx, height, i, true); // draw without motion as it stopped
            }
        }

        this._drawCanvasOnCanvas(ctx, width, height);

        if (mustRedraw) {
            if (this._badAndroid) {
                var nextFrameTime = this._frameStartTime + 1000 / 60;
                nextFrameTime = Math.max(0, nextFrameTime - Date.now());
                window.setTimeout(this._draw, nextFrameTime);
            } else {
                window.requestAnimationFrame(this._draw)
            }
        } else {
            this._ended();
        }
    },

    _drawCanvasOnCanvas: function (ctx, width, height) {
        width = Math.min(width, ctx.canvas.width); // Fix for Safari and FF ( must be in context range :) )

        if (!width) return; // canvas doesn't ready: DOM exception 11

        if (this._badAndroid) {
            if (this._androidChrome) {
                if (!this._android_chrome_fixed) {
                    this.canvasCtx.canvas.width = this.canvasCtx.width;
                    this._android_chrome_fixed = true;
                } else {
                    this.canvasCtx.clearRect(0, 0, width, height);
                }
            } else {
                var canvas = this.canvasCtx.canvas;
                this.canvasCtx.clearRect(0, 0, width, height);
                canvas.style.display = 'none';
                canvas.offsetHeight;
                canvas.style.display = 'inherit';
            }
        } else {
            this.canvasCtx.clearRect(0, 0, width, height);
        }

        this.canvasCtx.drawImage(ctx.canvas, 0, height / 5, width, height * 3 / 5,
            this.deltaX, this.deltaY, width, height * 3 / 5);
    },

    _drawBoard: function () {
        var ctx = this.ctx;
        var width = this.width;
        var height = 5 / 3 * this.height;

        this._initSlotLoopData();
        for (var i = 0; i < this.columnCount; i++) {
            this._drawColumn(ctx, height, i, true)
        }
        this._drawCanvasOnCanvas(ctx, width, height);
    },

    _drawColumn: function (ctx, height, i, withoutMotion) {
        ctx.clearRect(i * this.slotWidth, 0, this.slotWidth, height);

        if (!this._isDevice && !withoutMotion) {
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

        this.ctx.drawImage(img, x, y, width, height);
    },

    _fitImageInSlot: function (img) {
        var imgRatio = img.naturalWidth / img.naturalHeight;
        var slotRatio = this.slotWidth / this.slotHeight;
        var deltaW = 0, deltaH = 0, imageWidth, imageHeight;

        if (imgRatio > slotRatio) {
            imageWidth = this.slotWidth;
            imageHeight = imageWidth / imgRatio;
            deltaH = this.slotHeight - imageHeight;
        } else {
            imageHeight = this.slotHeight;
            imageWidth =  imageHeight * imgRatio;
            deltaW = this.slotWidth - imageWidth;
        }

        return {
            deltaW: deltaW,
            deltaH: deltaH
        }
    },

    _initContext: function () {
        this.canvasCtx = this.canvas.getContext('2d');
        this.ctx = document.createElement('canvas').getContext('2d');

        this._updateContext();

        var min = this.velocityRange[0];
        var max = this.velocityRange[1];
        this.incrementRangeTop = min + (max - min) * this.velocityCoefficient / 10;
        this.incrementRangeBottom = this.incrementRangeTop * 0.6;

        min = this.maxVelocityRange[0];
        max = this.maxVelocityRange[1];
        this.maxVelocityRangeTop = min + (max - min) * this.velocityCoefficient / 10;
        this.maxVelocityRangeBottom = this.maxVelocityRangeTop * 0.6;

        this._draw = this._draw.bind(this);
        this._drawBoard = this._drawBoard.bind(this);
    },

    _updateContext: function () {
        var canvas = this.canvas;
        var canvasCtx = this.canvasCtx;

        this.width = canvasCtx.width = canvas.width = canvas.clientWidth * window.devicePixelRatio;
        this.height = canvasCtx.height = canvas.height = canvas.clientHeight * window.devicePixelRatio;

        this.deltaX = this.width * this.marginHorizontal;
        this.deltaY = this.height * this.marginVertical;

        this.width -= 2 * this.deltaX;
        this.height -= 2 * this.deltaY;

        var c = this.ctx.canvas;
        var ctx = this.ctx;
        var width = ctx.width = c.width = this.width;
        var height = ctx.height = c.height = 5 / 3 * this.height;

        this.slotWidth = width / this.columnCount;
        this.slotHeight = height / 5;
    },

    _initHtmlContent: function () {
        this.playBtn.style.backgroundImage = 'url(' + this.playButtonUrl + ')';
        this.dom.style.backgroundImage = 'url(' + this.bgUrl + ')';
        this.canvas.style.backgroundImage = 'url(' + this.canvasBgUrl + ')';
    },

    _initDrawingData: function () {
        this.imageMatrix = [];
        for (var i = 0; i < this.columnCount; i++) {
            this.imageMatrix[i] = [];
            for (var j = 0; j < 5; j++) {
                this.imageMatrix[i].push(this._getRandomImage());
            }
        }
    },

    _getRandomImage: function () {
        // In case if probabilities are different this.imageIndexArray != this.slots
        var index = Math.floor(Math.random() * this.imageIndexArray.length);
        var imgIndex = this.imageIndexArray[index];
        return this.slots[imgIndex] || new Image();
    },

    _bindDOMEvents: function () {
        this.playBtn.addEventListener('click', this._slot.bind(this))
    }

};

function startGame() {
    SlotGame.init();
    SlotGame.initWidgetFromJson(Util.game_json);
    SlotGame.renderView(document.body);
    SlotGame.loadCreativeView(function () {
        console.log('ready to slot :)');
    });
}

window.addEventListener('load', startGame);