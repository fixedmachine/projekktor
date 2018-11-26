/*
* this file is part of:
* projekktor zwei
* http://www.projekktor.com
*
* Copyright 2010-2012, Sascha Kluger, Spinning Airwhale Media, http://www.spinningairwhale.com
* under GNU General Public License
* http://www.filenew.org/projekktor/license/
*/
(function (window, document, $, $p, projekktorConfig){
    
    "use strict";
    
projekktorConfig.prototype = {
    /**************************************************************
        Config options to be customized prior initialization only:
    ***************************************************************/

    _playerName:                    'Projekktor',

    _playerHome:                    'http://www.projekktor.com?via=context',

    /* Plugins to load on instance initialization, plugins are automatically extending the projekktorPluginInterface class.
    The order how the plugins are set here is important because they are added from z-index 0 to n one by one to the player DOM.
    As such it is useful to add the "Display" plugin always first.
    */
    _plugins:                       ['display', 'controlbar', 'contextmenu', 'settings'],

    /* Add one plugin or more plugins to the player. Alternative to "plugins" above. Will be merged with it. */
    _addplugins:                    [],

    /* custom reel parser (data:JSObject), default function(data){return data;} */
    _reelParser:                    null,

    /* Prefix prepended to all css-Classnames and data-attributes used by the player in order to avoid conflicts with existing layouts and scripts */
    _ns:                            'pp',

    /* a prioritized array of available platforms */
    _platforms:                     ['browser', 'android', 'ios', 'mse', 'native', 'videojs'],

    /* additional platforms config */
    _platformsConfig: {
        mse: {
            hlsjs: {
                src: '',
                initVars: {}
            },
            dashjs: {
                src: '',
                initVars: {}
            }
        },
        videojs: {
            src: ''
        }
    },

    _platformsFullscreenConfig: {
        browser: ['full', 'viewport'],
        native: ['full', 'mediaonly', 'viewport'],
        android: ['full', 'mediaonly', 'viewport'],
        ios: ['full', 'mediaonly', 'viewport'],
        mse: ['full', 'viewport'],
        videojs: ['full', 'viewport']
    },

    /* if set to true, projekktor assumes to live within an iframe and will act accordingly (used for embedding) */
    _iframe:                        false,

    /* if set to true projekktor will discard native media tag attributes (loop,controls,autoplay,preload etc.pp) */
    _ignoreAttributes:              false,

    /* looping scheduled media elements -  will be overwritten by loop-attribute of a replaced <video> tag. */
    _loop:                          false,

    /* automatically start playback once page has loaded -  will be overwritten by autoplay-attribute of a replaced <video> tag. */
    _autoplay:                      false,

    /* if more than one item is scheduled, true will automatically start playback of the next item in line once current one completed */
    _continuous:                    true,

    /* "true" will stop all other player instances but the one the user clicked play on. */
    _thereCanBeOnlyOne:             true,

    /* An array of items to be played. Check http://www.projekktor.com/docs/playlists to learn more */
    _playlist:                      [],

    /* debug on / off */
    _debug:                         false,
    debugLevel:                     'plugins,events,',

    /* the width of the player - >0= overwrite destNodes width, 0= keep dest node width, false=maintain ratio */
    _width:                         null,

    /* guess what.... the hight of the player - >0= overwrite destNodes height, 0 = keep height , false=maintain ratio */
    _height:                        null,

    _ratio:                         false,

    /* An array of objects featuring keycode=>function sets for keyboard-controls-customizing */
    _keys: [],

    /* cross domain */
    _isCrossDomain:                 false,

    /* on "true" try to leave fullscreen on player "complete" */
    _leaveFullscreen:               true,

    /* A prioritized list of available fullscreen modes:
     * - full - use HTML5 fullscreen API if available - will push all the player controls and video into fullscreen mode
     * - mediaonly - will use native video player in fullscreen mode (no custom overlays or controls will be displayed)
     * - viewport - this is 'pseudo fullscreen', it'll stretch the player with it's controls to the browser viewport size
     *
     * If the array is empty or value is null then the fullscreen functionality will be disabled. If you prefer to use
     * fullviewport mode even if the native fullscreen for <video> elements is available (e.g. iPad), just push 'viewport' before
     * 'mediaonly' into array like: ['full', 'viewport', 'mediaonly']
     */
    _fullscreen:                    ['full', 'mediaonly', 'viewport'],

    /**************************************************************
        Config options available per playlist item:
    ***************************************************************/

    /* unique itemID for the item currently played - dynamically generated if not provided via config */
    id:                             null,

    /* a title is a title is a title */
    title:                          null,

    cat:                            'clip',

    /* How to select best media format to play. There are two modes available:
        - 'platformsOrder'
        - 'sourcesOrder'
    */
    prioritizeBy: 'platformsOrder', 

    /* URL to poster image -  will be overwritten by poster-attribute of the replaced media tag. */
    poster:                         null,

    /* enable/disable controls -  will be overwritten by controls-attribute of the replaced <video> tag. */
    controls:                       true,

    /* start offset in seconds for randomly seekable media. (EXPERIMENTAL) */
    start:                          false,

    /* stop endpoint in seconds for randomly seekable media. (EXPERIMENTAL) */
    stop:                           false,

    /* initial volume on player-startup, 0=muted, 1=max */
    volume:                         0.8,

    /* a cover which will fill the display on audio-only playback */
    cover:                          '',

    /* enable/disable the possibility to PAUSE the video once playback started. */
    disablePause:                   false,

    /* enable/disable the possibility to skip the video by hitting NEXT or using the SCRUBBER */
    disallowSkip:                   false,

    /* if set to TRUE users can not change the volume of the player - neither via API nor through controls */
    fixedVolume:                    false,

    /* if set to true the initial value of muted will be always taken from configuration instead of user last remember settings */
    forceMuted: false,

    /* scaling used for images (playlist items and posters) "fill", "aspectratio" or "none" */
    imageScaling:                   'aspectratio',

    /* scaling used for videos (flash and native, not youtube) "fill", "aspectratio" or "none" */
    videoScaling:                   'aspectratio',

    /* defines the streamtype of the current item.
        'http':  http  streaming
    */
    streamType:                     'http',

    /* Youtube offers two different player APIs: fLaSh and "iFrame" for HTML5 . Make your choice here:
      For mobile devices this is forced to TRUE
    */
    useYTIframeAPI:                 true,

    /* enable/disable fetching of keyboard events - works in "fullscreen" only */
    enableKeyboard:                 true,

    /*
    small: Player height is 240px, and player dimensions are at least 320px by 240px for 4:3 aspect ratio.
    medium: Player height is 360px, and player dimensions are 640px by 360px (for 16:9 aspect ratio) or 480px by 360px (for 4:3 aspect ratio).
    large: Player height is 480px, and player dimensions are 853px by 480px (for 16:9 aspect ratio) or 640px by 480px (for 4:3 aspect ratio).
    hd720: Player height is 720px, and player dimensions are 1280px by 720px (for 16:9 aspect ratio) or 960px by 720px (for 4:3 aspect ratio).
    hd1080: Player height is 1080px, and player dimensions are 1920px by 1080px (for 16:9 aspect ratio) or 1440px by 1080px (for 4:3 aspect ratio).
    highres: Player height is greater than 1080px, which means that the player's aspect ratio is greater than 1920px by 1080px.
    */
    playbackQuality:                'auto',

    _playbackQualities:
    [
        {key: 'small', minHeight: 240, minWidth: 240},
        {key: 'medium', minHeight: 360, minWidth: [{ratio: 1.77, minWidth: 640}, {ratio: 1.33, minWidth: 480}]},
        {key: 'large', minHeight: 480, minWidth: [{ratio: 1.77, minWidth: 853}, {ratio: 1.33, minWidth: 640}]},
        {key: 'hd1080', minHeight: 1080, minWidth: [{ratio: 1.77, minWidth: 1920}, {ratio: 1.33, minWidth: 1440}]},
        {key: 'hd720', minHeight: 720, minWidth: [{ratio: 1.77, minWidth: 1280}, {ratio: 1.33, minWidth: 960}]},
        {key: 'highres', minHeight: 1081, minWidth: 0}
    ],

    /**
     * Format of dynamic stream (HDS, HLS, MSS, etc.) audio/video quality keys in which they will be displayed in the settings menu
     *
     * The available template values you can use:
     * %{width} - width in px
     * %{height} - height in px
     *
     * %{bitrate} - bitrate in kbps or Mbps
     * %{bitrateunit} - kbps or Mbps
     * %{bitratekbps} - bitrate in kbps
     * %{bitratembps} - bitrate in Mbps
     */
    dynamicStreamQualityKeyFormatAudioVideo: '%{height}p | %{bitrate}%{bitrateunit}',

    /**
     * Format of dynamic stream (HDS, HLS, MSS, etc.) audio-only quality keys in which they will be displayed in the settings menu
     *
     * The available template values you can use:
     * %{bitrate} - bitrate in kbps or Mbps
     * %{bitrateunit} - kbps or Mbps
     * %{bitratekbps} - bitrate in kbps
     * %{bitratembps} - bitrate in Mbps
     *
     * Note: the audio-only qualities will appear on the list only when the 'dynamicStreamShowAudioOnlyQualities' config option is set to true.
     */
    dynamicStreamQualityKeyFormatAudioOnly: 'audio | %{bitrate}%{bitrateunit}',

    /**
     * If the value is set to >0 than there will be decimal point and so many decimal places shown within
     * the bitrate parte of the key. E.g.:
     *
     * dynamicStreamQualityKeyBitrateRoundingDecimalPlacesCount: 2,
     * dynamicStreamQualityKeyFormatAudioVideo: '%{bitrate}%{bitrateunit}'
     * // stream bitrate = 1656kbps
     * // key will be rendered as: 1.66Mbps
     *
     */
    dynamicStreamQualityKeyBitrateRoundingDecimalPlacesCount: 0,

    // if true, the player will add audio only streams to the list of available qualities
    dynamicStreamShowAudioOnlyQualities: false,

    /* if testcard is disabled, the player will force a file download when no playback platform
    is available. Otherwise (enableTestcard=true) a testcard with an error message is shown in case of issues */
    enableTestcard:                 true,

    /* if the scheduled playlist holds more than one item an "skipTestcard" is set to TRUE in case of an error
    the player will proceed to the next item without showing a testcard */
    skipTestcard:                   false,

    /* (pre-) sets the media-duration / will be overwritten once META data is available */
    duration:                       0,

    /* add this CSS classes on startup */
    className:                      ''
};

}(window, document, jQuery, projekktor, projekktorConfig));