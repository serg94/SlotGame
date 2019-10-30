HTMLElement.prototype.show = function () {
    this.style.display = 'block'
};

HTMLElement.prototype.hide = function () {
    this.style.display = 'none'
};



var Util = {
    attachFont: function(){
        var url = "res/font/halo.regular.ttf";

        var css = '@font-face {font-family: halo;' +
            'src: url("'+ url + '");';

        var head = document.head || document.getElementsByTagName('head')[0];
        var style = document.createElement('style');
        style.type = 'text/css';

        if (style.styleSheet) {
            style.styleSheet.cssText = css;
        } else {
            style.appendChild(document.createTextNode(css));
        }
        head.appendChild(style);
    },
    loadImages: function (urls, success, failure) {
        var remainingCount = urls.length;
        var count = remainingCount;
        var images = [];
        var failed = false;

        var load = function () {
            if (failed) return;

            if (--remainingCount <= 0) {
                success(images)
            }
        };

        var error = function (e) {
            console.error(new Error('error loading image: ' + e.target.src));
            if (failed) {
                return;
            }
            failed = true;
            typeof failure == 'function' && failure();
        };

        while (count) {
            var img = new Image();
            img.onload = load;
            img.onerror = error;
            img.src = urls[urls.length - count];
            images.push(img);
            count--;
        }
    }
};

Util.game_json = {
    "resultPath": 'WLW', // win, lose, win, random...
    "randomSpinWinProbability": 50, // random has 50% win probability, set 0 to make probability natural
    "columns": 5,
    "bg": {
        "url": "res/bg/image.png"
    },
    "totalSpins": 10,
    "gameTime": 45,
    "speed": 5,
    "play_button": {
        "url": "res/bg/Spin_BTN_deselect.png"
    },
    "slot_items": [
        {
            "score": 100,
            "probability": 1,
            "url": "seven.png"
        },
        {
            "score": 100,
            "probability": 1,
            "url": "bar.png"
        },
        {
            "score": 100,
            "probability": 1,
            "url": "cherry.png"
        },
        {
            "score": 100,
            "probability": 1,
            "url": "lemon.png"
        },
        {
            "score": 100,
            "probability": 1,
            "url": "scatter.png"
        }
    ]
};