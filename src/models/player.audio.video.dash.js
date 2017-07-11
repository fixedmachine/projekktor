
jQuery(function ($) {
    $p.newModel({
        modelId: 'DASH',

        iLove: [
            {
                ext: 'ism',
                type: 'application/dash+xml',
                platform: ['browser'],
                streamType: ['*']
            },
            {
                ext: 'mpd',
                type: 'application/dash+xml',
                platform: ['browser'],
                streamType: ['*']
            }
        ],

        _dashJs: null,
        _hasInit: false,
        _file: null,
        _video: null,
        _mediaPlayer: null,
        _quality: null,
        _qualityMap: null,

        mediaElement: null,

        applyMedia: function (destContainer) {
            var ref = this;

            if (!this._hasInit) {
                this._hasInit = true;

                this._fetchDashJs(function (dashjs_) {
                    ref._dashJs = dashjs_;
                    ref._file = ref.getSource()[0];
                    ref._initMedia(destContainer);
                });
            } else {
                this._initMedia(destContainer);
            }
        },

        /**
         * Metoda `_initMedia` przygotowywuje odtwarzacz DashJS do działania.
         * 
         * @param {object} destContainer
         *        Kontener dla tagu HTML `video`
         */
        _initMedia: function (destContainer) {
            var ref = this;


            ///// Etap 1:
            // Tworzę instancję klasy "DashJS > MediaPlayer".
            this._mediaPlayer = this._dashJs.MediaPlayer().create();
            this._mediaPlayer.getDebug().setLogToBrowserConsole(false);

            // Ustawiam bufory:
            // this._mediaPlayer.setBufferPruningInterval(3);
            // this._mediaPlayer.setBufferTimeAtTopQuality(3);
            // this._mediaPlayer.setBufferTimeAtTopQualityLongForm(6);
            // this._mediaPlayer.setBufferToKeep(3);
            // this._mediaPlayer.setRichBufferThreshold(2);
            // this._mediaPlayer.setStableBufferTime(3);

            this.setQuality('auto');


            ///// Etap 2:
            // Szukam tagu 'video' i przypisuję uchwyt do zmiennej `this._video`,
            // jeżeli NIE znajdę tagu to go tworzę.
            var videoID = this.pp.getMediaId() + "_html";
            this._video = document.getElementById(videoID);

            if (!this._video) {
                this._video = $('<video/>').attr({
                    "id": videoID,
                    "poster": $p.utils.imageDummy(),
                    "loop": false,
                    "autoplay": false,
                    "preload": "none",
                    "x-webkit-airplay": "allow",
                    "playsinline": ""
                }).prop({
                    controls: false,
                    volume: this.getVolume()
                }).css({
                    'width': '100%',
                    'height': '100%',
                    'position': 'absolute',
                    'top': 0,
                    'left': 0
                })[0];

                destContainer.html('').append(this._video);
            }

            this.mediaElement = $(this._video);


            ///// Etap 3:
            // Podpinam zdarzenia do `this._mediaPlayer`.
            var events = this._dashJs.MediaPlayer.events;

            this._mediaPlayer.on(events["PLAYBACK_TIME_UPDATED"], function (data) {

                ref.timeListener({
                    position: data['time'],
                    duration: (0.0 + data['time'] + data['timeToEnd'])
                });

            });

            this._mediaPlayer.on(events["PLAYBACK_SEEKED"], function () {
                ref.seekedListener(ref._mediaPlayer.time());
            });

            this._mediaPlayer.on(events["PLAYBACK_PLAYING"], function () {
                ref.playingListener();
            });

            this._mediaPlayer.on(events["PLAYBACK_PAUSED"], function () {
                ref.pauseListener();
            });

            this._mediaPlayer.on(events["PLAYBACK_PROGRESS"], function () {
                // ...
            });

            this._mediaPlayer.on(events["PLAYBACK_ENDED"], function () {
                ref.endedListener(null);
            });

            this._mediaPlayer.on(events["CAN_PLAY"], function () {

                var qualityList = ref._getQualityList()

                if (ref._qualityMap === null) {
                    ref._qualityMap = {};
                }

                for (var i = 0; i < qualityList.length; i++) {
                    ref._qualityMap[qualityList[i]] = i;
                }

                ref.sendUpdate('availableQualitiesChange', qualityList);
                ref.displayReady();
                ref.ready();

                ref.canplayListener(null);
            });

            this._mediaPlayer.on(events["BUFFER_EMPTY"], function () {
                ref._setBufferState('EMPTY');
            });

            this._mediaPlayer.on(events["MANIFEST_LOADED"], function () {
            });


            ///// Etap 5:
            // Stosuję (ustawiam) źródło mediów (+ licencji dla DRM)
            this.applySrc();

        },

        detachMedia: function () {

            if (!!this.mediaElement) {
                this.mediaElement = null;
            }

            if (!!this._mediaPlayer) {
                this._mediaPlayer.reset();
                this._mediaPlayer = null;
            }

            if (!!this._video) {
                this._video.parentNode.removeChild(this._video);
                this._video = null;
            }

            this._qualityMap = null;
            this._quality = null;

        },

        /**
         * Metoda `applySrc` ustawia adres źródła mediów.
         */
        applySrc: function () {
            // Inicjuje MediaPlayer z biblioteki "Dash JS":
            this._mediaPlayer.initialize(this._video, null, false);

            this._mediaPlayer.setProtectionData({
                "com.microsoft.playready": {
                    serverURL: this._file['playready'] || null
                },
                "com.widevine.alpha": {
                    serverURL: this._file['widevine'] || null
                }
            });

            this._mediaPlayer.attachSource(this._file['src']);
        },

        /**
         * Metoda `_fetchDashJs` zwraca obiekt `window.dashjs` gdy jest dostępny.
         * W przeciwnym wypadku ładuję bibliotekę DashJS, a po zakończaniu ładowania zwraca `window.dashjs`.
         * 
         * @param {function|null} cb
         *        {function} Funkcja zwrotna wywoływana gdy biblioteka DashJS zostanie załadowana
         *                   Wywołanie `cb(dashjs)`
         *                  `dashjs` zawiera referencję do biblioteki DashJS.
         *        {null} Brak wywołania zwrotnego!
         */
        _fetchDashJs: function (cb) {

            if (typeof window.dashjs === "object") {

                cb(window.dashjs);

            } else {
                var script = document.getElementById('DashJS');

                if (!script) {
                    this._appendDashJs(null);
                }

                var itrv = setInterval(function () {

                    if (typeof window.dashjs === "object") {
                        clearInterval(itrv);

                        if (!!cb) {
                            cb(window.dashjs);
                        }
                    }

                }, 100);

            }
        },

        /**
         * Metoda `_appendDashJs` ładuję bibliotekę 'dash.all.min.js' z oficjalnego serwera CDN.
         */
        _appendDashJs: function (cb) {
            var script = document.createElement('script');

            script.id = 'DashJS';
            script.type = "text/javascript";
            script.async = true;
            script.src = '//cdn.dashjs.org/latest/dash.all.min.js';
            //script.src = '//cdn.dashjs.org/latest/dash.all.debug.js';

            (document.getElementsByTagName('head')[0]).appendChild(script);

            if (!!cb) {
                script.addEventListener('load', cb);
            }
        },

        _getQualityList: function () {
            var videoList = this._mediaPlayer.getBitrateInfoListFor('video');
            //var audioList = this._mediaPlayer.getBitrateInfoListFor('audio');

            var buffer = [];
            for (var i = 0; i < videoList.length; i++) {
                var e = videoList[i];
                buffer.push("" + $p.utils.roundNumber((e['bitrate'] / 1024), 0) + "Kbps | " + e['height'] + "p");
            }

            buffer.push('auto');
            return buffer;
        },

        /*****************************************
         * Setters
         ****************************************/
        setPlay: function () {
            this._mediaPlayer.play();
            this._setState('playing');
        },

        setPause: function () {
            this._mediaPlayer.pause();
            this._setState('paused');
        },

        setSeek: function (newpos) {
            var ref = this;

            ref._mediaPlayer.seek(newpos);

            ref.timeListener({
                position: newpos
            });

        },

        setVolume: function (value) {

            if (!!this._mediaPlayer) {
                this._mediaPlayer.setVolume(value);
            }

            if (this.mediaElement === null) {
                this.volumeListener(value);
            }

        },

        setQuality: function (quality) {

            if (this._quality === quality) {
                return;
            }

            if (quality === "auto") {
                this._mediaPlayer.setAutoSwitchQualityFor('video', true);
            } else {
                this._mediaPlayer.setAutoSwitchQualityFor('video', false);
                this._mediaPlayer.setQualityFor('video', this._qualityMap[quality]);
            }

            this._quality = quality;
        },

        /************************************************
         * Getters
         ************************************************/
        getVolume: function () {

            var v = 0;

            try {
                v = this._mediaPlayer.getVolume();
            } catch (err) {
                v = this._volume;
            };

            return v;

        },

        getQuality: function () {
            return this._quality;
        }

    });
});