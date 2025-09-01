const ArgumentType = require('../../extension-support/argument-type');
const BlockType = require('../../extension-support/block-type');
const Clone = require('../../util/clone');
const MathUtil = require('../../util/math-util');
const formatMessage = require('format-message');
const Video = require('../../io/video');
const TargetType = require('../../extension-support/target-type');
const {distance, toScratchCoords} = require('./utils');

const FaceDetection = require('@tensorflow-models/face-detection');
const mediapipePackage = require('@mediapipe/face_detection/package.json');

/**
 * Icon svg to be displayed in the blocks category menu, encoded as a data URI.
 * @type {string}
 */
// eslint-disable-next-line max-len
const menuIconURI = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGcgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIj48Y2lyY2xlIGZpbGw9IiM0Qzk3RkYiIGN4PSIxNS41IiBjeT0iMTcuNSIgcj0iMS41Ii8+PGNpcmNsZSBmaWxsPSIjNEM5N0ZGIiBjeD0iMjQuNSIgY3k9IjE3LjUiIHI9IjEuNSIvPjxwYXRoIGQ9Ik0yMCA5QzEzLjkyNSA5IDkgMTMuOTI1IDkgMjBzNC45MjUgMTEgMTEgMTEgMTEtNC45MjUgMTEtMTFTMjYuMDc1IDkgMjAgOXptMCAyYTkgOSAwIDExMCAxOCA5IDkgMCAwMTAtMTh6IiBmaWxsPSIjNEM5N0ZGIiBmaWxsLXJ1bGU9Im5vbnplcm8iLz48cGF0aCBkPSJNMzUgNGExIDEgMCAwMS45OTMuODgzTDM2IDV2NmExIDEgMCAwMS0xLjk5My4xMTdMMzQgMTFWNmgtNWExIDEgMCAwMS0uOTkzLS44ODNMMjggNWExIDEgMCAwMS44ODMtLjk5M0wyOSA0aDZ6TTUgMzZhMSAxIDAgMDEtLjk5My0uODgzTDQgMzV2LTZhMSAxIDAgMDExLjk5My0uMTE3TDYgMjl2NWg1YTEgMSAwIDAxLjk5My44ODNMMTIgMzVhMSAxIDAgMDEtLjg4My45OTNMMTEgMzZINXoiIGZpbGwtb3BhY2l0eT0iLjUiIGZpbGw9IiM0RDk3RkYiIGZpbGwtcnVsZT0ibm9uemVybyIvPjxwYXRoIGQ9Ik0yMi4xNjggMjEuOTQ1YTEgMSAwIDExMS42NjQgMS4xMUMyMi45NzQgMjQuMzQyIDIxLjY1OCAyNSAyMCAyNXMtMi45NzQtLjY1OC0zLjgzMi0xLjk0NWExIDEgMCAxMTEuNjY0LTEuMTFDMTguMzA3IDIyLjY1OCAxOC45OTIgMjMgMjAgMjNjMS4wMDkgMCAxLjY5My0uMzQyIDIuMTY4LTEuMDU1eiIgZmlsbD0iIzRDOTdGRiIgZmlsbC1ydWxlPSJub256ZXJvIi8+PHBhdGggZD0iTTI5LjcyIDI0LjAyOGEyLjU1NyAyLjU1NyAwIDAwMS44MDgtMS44MDhsLjU0NC0yLjAwOWMuMjUyLS45NDggMS42LS45NDggMS44NTYgMGwuNTQgMi4wMDlhMi41NjMgMi41NjMgMCAwMDEuODEzIDEuODA4bDIuMDA4LjU0NGMuOTQ4LjI1Mi45NDggMS42IDAgMS44NTdsLTIuMDA4LjU0YTIuNTYzIDIuNTYzIDAgMDAtMS44MTMgMS44MDhsLS41NCAyLjAwOWMtLjI1Ni45NTItMS42MDQuOTUyLTEuODU2IDBsLS41NDQtMi4wMDlhMi41NTcgMi41NTcgMCAwMC0xLjgwOS0xLjgwOGwtMi4wMDgtLjU0Yy0uOTQ4LS4yNTYtLjk0OC0xLjYwNSAwLTEuODU3bDIuMDA4LS41NDR6TTUuMDQgNi4zOTZBMS45MTggMS45MTggMCAwMDYuMzk2IDUuMDRsLjQwOC0xLjUwN2MuMTg5LS43MSAxLjItLjcxIDEuMzkyIDBsLjQwNSAxLjUwN2ExLjkyMiAxLjkyMiAwIDAwMS4zNiAxLjM1NmwxLjUwNi40MDhjLjcxLjE5LjcxIDEuMiAwIDEuMzkzbC0xLjUwNy40MDVhMS45MjIgMS45MjIgMCAwMC0xLjM1OSAxLjM1NmwtLjQwNSAxLjUwNmMtLjE5Mi43MTUtMS4yMDMuNzE1LTEuMzkyIDBsLS40MDgtMS41MDZBMS45MTggMS45MTggMCAwMDUuMDQgOC42MDJsLTEuNTA3LS40MDVjLS43MS0uMTkyLS43MS0xLjIwNCAwLTEuMzkzbDEuNTA3LS40MDh6IiBmaWxsPSIjRkZCRjAwIi8+PHBhdGggZD0iTTMxLjU4OSAyMC4wODNsLS41NDQgMi4wMDZhMi4wNTggMi4wNTggMCAwMS0xLjQ1NyAxLjQ1N2wtMi4wMDguNTQ0Yy0xLjQ0LjM4My0xLjQ0IDIuNDMyIDAgMi44MjFsMi4wMS41NGMuNzEuMTkgMS4yNjQuNzQ2IDEuNDU1IDEuNDU2bC41NDQgMi4wMWMuMzgzIDEuNDQ1IDIuNDMzIDEuNDQ1IDIuODIyLS4wMDFsLjU0LTIuMDA5YTIuMDYzIDIuMDYzIDAgMDExLjQ1OS0xLjQ1NWwyLjAwOS0uNTRjMS40NDItLjM5IDEuNDQyLTIuNDQtLjAwMi0yLjgyM2wtMi4wMDYtLjU0M2EyLjA2MiAyLjA2MiAwIDAxLTEuNDYtMS40NTVsLS41NC0yLjAxYy0uMzktMS40NDItMi40MzktMS40NDItMi44MjIuMDAyem0xLjg1Ni4yNTlsLjU0IDIuMDA4YTMuMDYyIDMuMDYyIDAgMDAyLjE2NSAyLjE2bDIuMDA4LjU0NWMuNDU2LjEyLjQ1Ni43NjggMCAuODkxbC0yLjAwNy41NGEzLjA2MiAzLjA2MiAwIDAwLTIuMTY2IDIuMTYybC0uNTQgMi4wMDhjLS4xMjMuNDU4LS43NjkuNDU4LS44OS4wMDJsLS41NDUtMi4wMTFhMy4wNTcgMy4wNTcgMCAwMC0yLjE2Mi0yLjE2MWwtMi4wMDctLjU0Yy0uNDU1LS4xMjMtLjQ1NS0uNzctLjAwMS0uODlsMi4wMS0uNTQ1YTMuMDU3IDMuMDU3IDAgMDAyLjE2LTIuMTYybC41NDQtMi4wMDdjLjEyMi0uNDU2Ljc2OS0uNDU2Ljg5MSAweiIgZmlsbC1vcGFjaXR5PSIuNSIgZmlsbD0iIzAwMCIgZmlsbC1ydWxlPSJub256ZXJvIi8+PHBhdGggZD0iTTYuMzIgMy40MDVsLS40MDcgMS41MDRjLS4xMy40OS0uNTExLjg3LTEuMDA0IDEuMDA1bC0xLjUwNi40MDhjLTEuMjA0LjMyLTEuMjA0IDIuMDMyIDAgMi4zNTdsMS41MDcuNDA1Yy40OS4xMzEuODcyLjUxNCAxLjAwMyAxLjAwM2wuNDA4IDEuNTA4Yy4zMiAxLjIwNyAyLjAzMyAxLjIwNyAyLjM1OCAwbC40MDUtMS41MDdhMS40MjIgMS40MjIgMCAwMTEuMDA1LTEuMDAzbDEuNTA4LS40MDZjMS4yMDQtLjMyNSAxLjIwNC0yLjAzNy0uMDAyLTIuMzU4bC0xLjUwNC0uNDA4YTEuNDIyIDEuNDIyIDAgMDEtMS4wMDctMS4wMDJMOC42OCAzLjQwM2MtLjMyNS0xLjIwNC0yLjAzOC0xLjIwNC0yLjM1OC4wMDJ6bTEuMzkzLjI1OWwuNDA1IDEuNTA2QTIuNDIxIDIuNDIxIDAgMDA5LjgzIDYuODc5bDEuNTA3LjQwOGMuMjE4LjA1OC4yMTguMzY4IDAgLjQyN2wtMS41MDUuNDA1YTIuNDIyIDIuNDIyIDAgMDAtMS43MTMgMS43MWwtLjQwNSAxLjUwNmMtLjA1OS4yMi0uMzY4LjIyLS40MjYuMDAxbC0uNDA5LTEuNTA5YTIuNDE3IDIuNDE3IDAgMDAtMS43MS0xLjcwOGwtMS41MDUtLjQwNWMtLjIxNy0uMDU5LS4yMTctLjM3LS4wMDEtLjQyN0w1LjE3IDYuODhhMi40MTggMi40MTggMCAwMDEuNzA5LTEuNzFsLjQwNy0xLjUwNWMuMDU5LS4yMTguMzY5LS4yMTguNDI3IDB6IiBmaWxsLW9wYWNpdHk9Ii40IiBmaWxsPSIjMDAwIiBmaWxsLXJ1bGU9Im5vbnplcm8iLz48L2c+PC9zdmc+';

/**
 * Icon svg to be displayed at the left edge of each extension block, encoded as a data URI.
 * @type {string}
 */
// eslint-disable-next-line max-len
const blockIconURI = 'data:image/svg+xml;base64,PHN2ZyBoZWlnaHQ9IjQwIiB3aWR0aD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgdmlld0JveD0iMCAwIDIzLjg0IDIxLjQ2Ij4KICAgIDxjaXJjbGUgZmlsbD0iI2ZmZiIgY3g9IjguMzUiIGN5PSI5LjY1IiByPSIuOTciLz4KICAgIDxjaXJjbGUgZmlsbD0iI2ZmZiIgY3g9IjE0LjE5IiBjeT0iOS42NSIgcj0iLjk3Ii8+CiAgICA8cGF0aCBmaWxsPSIjZmZmIiBkPSJNMTEuMjcsNC4xNGMtMy45NCwwLTcuMTMsMy4xOS03LjEzLDcuMTNzMy4xOSw3LjEzLDcuMTMsNy4xMyw3LjEzLTMuMTksNy4xMy03LjEzLTMuMTktNy4xMy03LjEzLTcuMTNaTTExLjI3LDUuNDRjMy4yMiwwLDUuODQsMi42MSw1Ljg0LDUuODRzLTIuNjEsNS44NC01Ljg0LDUuODQtNS44NC0yLjYxLTUuODQtNS44NCwyLjYxLTUuODQsNS44NC01Ljg0WiIvPgogICAgPHBhdGggZmlsbD0iI2ZmYmYwMCIgZmlsbC1ydWxlPSJldmVub2RkIiBzdHJva2U9IiMwYjhlNjkiIHN0cm9rZS1taXRlcmxpbWl0PSIyIiBzdHJva2Utd2lkdGg9Ii41cHgiIGQ9Ik0xNy41NywxMy44OGMuNTctLjE1LDEuMDItLjYsMS4xNy0xLjE3bC4zNS0xLjNjLjE2LS42MSwxLjA0LS42MSwxLjIsMGwuMzUsMS4zYy4xNS41Ny42LDEuMDIsMS4xOCwxLjE3bDEuMy4zNWMuNjEuMTYuNjEsMS4wNCwwLDEuMmwtMS4zLjM1Yy0uNTcuMTUtMS4wMi42LTEuMTgsMS4xN2wtLjM1LDEuM2MtLjE3LjYyLTEuMDQuNjItMS4yLDBsLS4zNS0xLjNjLS4xNS0uNTctLjYtMS4wMi0xLjE3LTEuMTdsLTEuMy0uMzVjLS42MS0uMTctLjYxLTEuMDQsMC0xLjJsMS4zLS4zNWgwWk0xLjU3LDIuNDVjLjQzLS4xMi43Ni0uNDUuODgtLjg4bC4yNi0uOThjLjEyLS40Ni43OC0uNDYuOSwwbC4yNi45OGMuMTIuNDMuNDUuNzYuODguODhsLjk4LjI2Yy40Ni4xMi40Ni43OCwwLC45bC0uOTguMjZjLS40My4xMS0uNzcuNDUtLjg4Ljg4bC0uMjYuOThjLS4xMi40Ni0uNzguNDYtLjksMGwtLjI2LS45OGMtLjEyLS40My0uNDUtLjc2LS44OC0uODhsLS45OC0uMjZjLS40Ni0uMTItLjQ2LS43OCwwLS45bC45OC0uMjZaIi8+CiAgICA8cGF0aCBmaWxsPSIjZmZmIiBkPSJNMTIuNjgsMTIuNTNjLjItLjMuNi0uMzguOS0uMTguMy4yLjM4LjYuMTguOS0uNTYuODMtMS40MSwxLjI2LTIuNDgsMS4yNnMtMS45My0uNDMtMi40OC0xLjI2Yy0uMi0uMy0uMTItLjcuMTgtLjkuMy0uMi43LS4xMi45LjE4LjMxLjQ2Ljc1LjY4LDEuNDEuNjhzMS4xLS4yMiwxLjQxLS42OFoiLz4KICAgIDxwYXRoIGZpbGw9IiMwYjhlNjkiIGQ9Ik0yMC44OSw2LjA2Yy0uMzEsMC0uNTctLjI1LS41Ny0uNTd2LTMuMjloLTMuMzFjLS4zMSwwLS41Ny0uMjUtLjU3LS41N3MuMjUtLjU3LjU3LS41N2gzLjg4Yy4zMSwwLC41Ny4yNS41Ny41N3YzLjg2YzAsLjMxLS4yNS41Ny0uNTcuNTdaIi8+CiAgICA8cGF0aCBmaWxsPSIjMGI4ZTY5IiBkPSJNNS40NCwyMS40NkgxLjU5Yy0uMzEsMC0uNTctLjI1LS41Ny0uNTd2LTMuODJjMC0uMzEuMjUtLjU3LjU3LS41N3MuNTcuMjUuNTcuNTd2My4yNWgzLjI4Yy4zMSwwLC41Ny4yNS41Ny41N3MtLjI1LjU3LS41Ny41N1oiLz4KPC9zdmc+Cg==';

/**
 * Class for the motion-related blocks in Scratch 3.0
 * @param {Runtime} runtime - the runtime instantiating this block package.
 * @constructor
 */
class Scratch3FaceSensingBlocks {
    constructor (runtime) {
        /**
         * The runtime instantiating this block package.
         * @type {Runtime}
         */
        this.runtime = runtime;

        /**
         * Cached value for detected face size
         * @type {number}
         */
        this._cachedSize = 100;

        /**
         * Cached value for detected tilt angle
         * @type {number}
         */
        this._cachedTilt = 90;

        /**
         * Smoothed value for whether or not a face was detected
         * @type {boolean}
         */
        this._smoothedIsDetected = false;

        /**
         * History of recent face-detection results
         * @type {Array.<boolean>}
         */
        this._isDetectedArray = Array.from(
            {length: Scratch3FaceSensingBlocks.IS_DETECTED_ARRAY_LENGTH},
            () => false
        );

        this.runtime.emit('EXTENSION_DATA_LOADING', true);

        const model = FaceDetection.SupportedModels.MediaPipeFaceDetector;
        const detectorConfig = {
            runtime: 'mediapipe',
            solutionPath: '/chunks/mediapipe/face_detection',
            maxFaces: 1
        };
    
        FaceDetection.createDetector(model, detectorConfig)
            .catch(() => {
                const fallbackConfig = {
                    runtime: 'mediapipe',
                    solutionPath: `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection@${mediapipePackage.version}`,
                    maxFaces: 1
                };

                return FaceDetection.createDetector(model, fallbackConfig);
            })
            .then(detector => {
                this._faceDetector = detector;
                if (this.runtime.ioDevices) {
                    this._loop();
                }
            });

        this._clearAttachments = this._clearAttachments.bind(this);
        this.runtime.on('PROJECT_STOP_ALL', this._clearAttachments);
    }

    /**
     * After analyzing a frame the amount of milliseconds until another frame
     * is analyzed.
     * @type {number}
     */
    static get INTERVAL () {
        return 1000 / 15;
    }

    /**
     * Dimensions the video stream is analyzed at after it's rendered to the
     * sample canvas.
     * @type {Array.<number>}
     */
    static get DIMENSIONS () {
        return [480, 360];
    }

    /**
     * The key to load & store a target's face sensing state.
     * @type {string}
     */
    static get STATE_KEY () {
        return 'Scratch.faceSensing';
    }

    /**
     * The default face sensing state, to be used when a target has no existing state.
     * @type {FaceSensingState}
     */
    static get DEFAULT_FACE_SENSING_STATE () {
        return {
            attachedToPartNumber: null
        };
    }

    /**
     * Maximum length of face detection history
     * @type {number}
     */
    static get IS_DETECTED_ARRAY_LENGTH () {
        return 5;
    }

    /**
     * Occasionally step a loop to sample the video, stamp it to the preview
     * skin, and add a TypedArray copy of the canvas's pixel data.
     * @private
     */
    _loop () {
        setTimeout(this._loop.bind(this), Math.max(this.runtime.currentStepTime, Scratch3FaceSensingBlocks.INTERVAL));

        const frame = this.runtime.ioDevices.video.getFrame({
            format: Video.FORMAT_IMAGE_DATA,
            dimensions: Scratch3FaceSensingBlocks.DIMENSIONS,
            cacheTimeout: this.runtime.currentStepTime
        });
        if (frame) {
            this._faceDetector.estimateFaces(frame).then(faces => {
                if (faces && faces.length > 0) {
                    if (!this._firstTime) {
                        this._firstTime = true;
                        this.runtime.emit('EXTENSION_DATA_LOADING', false);
                    }
                    this._currentFace = faces[0];
                } else {
                    this._currentFace = null;
                }
                this._updateIsDetected();
            });
        }
    }

    /**
     * Update the smoothed face-detection state based on the most recent result.
     * @private
     */
    _updateIsDetected () {
        this._isDetectedArray.push(!!this._currentFace);

        if (this._isDetectedArray.length > Scratch3FaceSensingBlocks.IS_DETECTED_ARRAY_LENGTH) {
            this._isDetectedArray.shift();
        }

        // if every recent detection is false, set to false
        if (this._isDetectedArray.every(item => item === false)) {
            this._smoothedIsDetected = false;
        }

        // if every recent detection is true, set to true
        if (this._isDetectedArray.every(item => item === true)) {
            this._smoothedIsDetected = true;
        }

        // if there's a mix of true and false values, do not change the result
    }

    /**
     * Retrieve the face-sensing state for a given target.
     * If no state exists yet, clone the default and set it on the target.
     *
     * @param {Target} target - collect face sensing state for this target.
     * @returns {FaceSensingState} the face sensing state associated with that target.
     * @private
     */
    _getFaceSensingState (target) {
        let faceSensingState = target.getCustomState(Scratch3FaceSensingBlocks.STATE_KEY);

        if (!faceSensingState) {
            faceSensingState = Clone.simple(Scratch3FaceSensingBlocks.DEFAULT_FACE_SENSING_STATE);
            target.setCustomState(Scratch3FaceSensingBlocks.STATE_KEY, faceSensingState);
        }

        return faceSensingState;
    }

    /**
     * @returns {object} metadata for this extension and its blocks.
     */
    getInfo () {
        // Enable the video layer
        this.runtime.ioDevices.video.enableVideo();

        return {
            id: 'faceSensing',
            name: formatMessage({
                id: 'faceSensing.categoryName',
                default: 'Face Sensing',
                description: 'Name of face sensing extension'
            }),
            blockIconURI: blockIconURI,
            menuIconURI: menuIconURI,
            blocks: [
                {
                    opcode: 'goToPart',
                    text: formatMessage({
                        id: 'faceSensing.goToPart',
                        default: 'go to [PART]',
                        description: ''
                    }),
                    blockType: BlockType.COMMAND,
                    arguments: {
                        PART: {
                            type: ArgumentType.STRING,
                            menu: 'PART',
                            defaultValue: '2'
                        }
                    },
                    filter: [TargetType.SPRITE]
                },
                {
                    opcode: 'pointInFaceTiltDirection',
                    text: formatMessage({
                        id: 'faceSensing.pointInFaceTiltDirection',
                        default: 'point in direction of face tilt',
                        description: ''
                    }),
                    blockType: BlockType.COMMAND,
                    filter: [TargetType.SPRITE]
                },
                {
                    opcode: 'setSizeToFaceSize',
                    text: formatMessage({
                        id: 'faceSensing.setSizeToFaceSize',
                        default: 'set size to face size',
                        description: ''
                    }),
                    blockType: BlockType.COMMAND,
                    filter: [TargetType.SPRITE]
                },
                {
                    opcode: 'whenTilted',
                    text: formatMessage({
                        id: 'faceSensing.whenTilted',
                        default: 'when face tilts [DIRECTION]',
                        description: ''
                    }),
                    blockType: BlockType.HAT,
                    arguments: {
                        DIRECTION: {
                            type: ArgumentType.STRING,
                            menu: 'TILT',
                            defaultValue: 'left'
                        }
                    }
                },
                {
                    opcode: 'whenSpriteTouchesPart',
                    text: formatMessage({
                        id: 'faceSensing.whenSpriteTouchesPart',
                        default: 'when this sprite touches a [PART]',
                        description: ''
                    }),
                    arguments: {
                        PART: {
                            type: ArgumentType.STRING,
                            menu: 'PART',
                            defaultValue: '2'
                        }
                    },
                    blockType: BlockType.HAT,
                    filter: [TargetType.SPRITE]
                },
                {
                    opcode: 'whenFaceDetected',
                    text: formatMessage({
                        id: 'faceSensing.whenFaceDetected',
                        default: 'when a face is detected',
                        description: ''
                    }),
                    blockType: BlockType.HAT
                },
                {
                    opcode: 'faceIsDetected',
                    text: formatMessage({
                        id: 'faceSensing.faceDetected',
                        default: 'a face is detected?',
                        description: ''
                    }),
                    blockType: BlockType.BOOLEAN
                },
                {
                    opcode: 'faceTilt',
                    text: formatMessage({
                        id: 'faceSensing.faceTilt',
                        default: 'face tilt',
                        description: ''
                    }),
                    blockType: BlockType.REPORTER
                },
                {
                    opcode: 'faceSize',
                    text: formatMessage({
                        id: 'faceSensing.faceSize',
                        default: 'face size',
                        description: ''
                    }),
                    blockType: BlockType.REPORTER
                }
            ],
            menus: {
                PART: [
                    {text: 'nose', value: '2'},
                    {text: 'mouth', value: '3'},
                    {text: 'left eye', value: '0'},
                    {text: 'right eye', value: '1'},
                    {text: 'between eyes', value: '6'},
                    {text: 'left ear', value: '4'},
                    {text: 'right ear', value: '5'},
                    {text: 'top of head', value: '7'}
                ],
                TILT: [
                    {text: 'left', value: 'left'},
                    {text: 'right', value: 'right'}
                ]
            }
        };
    }

    /**
     * Center point of a line between the eyes
     *
     * @returns {{x: number, y: number}} Coordinates of the detected point between eyes.
     * @private
     */
    _getBetweenEyesPosition () {
        const leftEye = this._getPartPosition(0);
        const rightEye = this._getPartPosition(1);
        const betweenEyes = {x: 0, y: 0};
        betweenEyes.x = leftEye.x + ((rightEye.x - leftEye.x) / 2);
        betweenEyes.y = leftEye.y + ((rightEye.y - leftEye.y) / 2);
        return betweenEyes;
    }

    /**
     * Estimated top of the head point:
     * Make a line perpendicular to the line between the eyes, through
     * its center, and move upward along it the distance from the point
     * between the eyes to the mouth.
     *
     * @returns {{x: number, y: number}} Coordinates of the detected top of head position.
     * @private
     */
    _getTopOfHeadPosition () {
        const leftEyePos = this._getPartPosition(0);
        const rightEyePos = this._getPartPosition(1);
        const mouthPos = this._getPartPosition(3);
        const dx = rightEyePos.x - leftEyePos.x;
        const dy = rightEyePos.y - leftEyePos.y;
        const directionRads = Math.atan2(dy, dx) + (Math.PI / 2);
        const betweenEyesPos = this._getBetweenEyesPosition();
        const mouthDistance = distance(betweenEyesPos, mouthPos);

        const topOfHeadPosition = {x: 0, y: 0};
        topOfHeadPosition.x = betweenEyesPos.x + (mouthDistance * Math.cos(directionRads));
        topOfHeadPosition.y = betweenEyesPos.y + (mouthDistance * Math.sin(directionRads));

        return topOfHeadPosition;
    }

    /**
     * Get the position of a given facial keypoint.
     * Returns {0,0} if no face or keypoints are available.
     *
     * @param {number} part - Part of the face to be detected
     * @returns {{x: number, y: number}} Coordinates of the detected keypoint.
     * @private
     */
    _getPartPosition (part) {
        const defaultPos = {x: 0, y: 0};

        if (!this._currentFace) return defaultPos;
        if (!this._currentFace.keypoints) return defaultPos;

        if (Number(part) === 6) {
            return this._getBetweenEyesPosition();
        }
        if (Number(part) === 7) {
            return this._getTopOfHeadPosition();
        }

        const result = this._currentFace.keypoints[Number(part)];
        if (result) {
            const res = toScratchCoords(result);
            return res;
        }
        return defaultPos;
    }

    /**
     * A scratch hat block handle that reports whether
     * a target sprite is touching a given facial keypoint
     *
     * @param {object} args - the block arguments
     * @param {BlockUtility} util - the block utility
     * @returns {boolean} - true if the sprite is touching the given point
     */
    whenSpriteTouchesPart (args, util) {
        if (!this._currentFace) return false;
        if (!this._currentFace.keypoints) return false;

        const pos = this._getPartPosition(args.PART);
        return util.target.isTouchingScratchPoint(pos.x, pos.y);
    }

    /**
     * A scratch hat block handle that reports whether
     * a face is detected
     *
     * @returns {boolean} - true a face was detected
     */
    whenFaceDetected () {
        return this._smoothedIsDetected;
    }

    /**
     * A scratch boolean block handle that reports whether
     * a face is detected
     *
     * @returns {boolean} - true a face was detected
     */
    faceIsDetected () {
        return this._smoothedIsDetected;
    }

    /**
     * A scratch reporter block handle that calculates the face size and caches it.
     *
     * @returns {number} the face size
     */
    faceSize () {
        if (!this._currentFace) return this._cachedSize;

        const size = Math.round(this._currentFace.box.height);
        this._cachedSize = size;
        return size;
    }

    /**
     * A scratch command block handle that sets the size of a target to the current face size
     *
     * @param {object} args - the block arguments
     * @param {BlockUtility} util - the block utility
     */
    setSizeToFaceSize (args, util) {
        if (!this._currentFace) return;

        util.target.setSize(this.faceSize());
    }

    /**
     * A scratch reporter block handle that calculates the face tilt and caches it.
     *
     * @returns {number} the face tilt
     */
    faceTilt () {
        if (!this._currentFace) return this._cachedTilt;

        const leftEyePos = this._getPartPosition(0);
        const rightEyePos = this._getPartPosition(1);
        const dx = rightEyePos.x - leftEyePos.x;
        const dy = rightEyePos.y - leftEyePos.y;
        const direction = 90 - MathUtil.radToDeg(Math.atan2(dy, dx));
        const tilt = Math.round(direction);

        this._cachedTilt = tilt;

        return tilt;
    }

    /**
     * A scratch hat block handle that reports whether
     * a detected face is tilted
     *
     * @param {object} args - the block arguments
     * @returns {boolean} - true if the face is tilted
     */
    whenTilted (args) {
        const TILT_THRESHOLD = 10;

        if (args.DIRECTION === 'left') {
            return this.faceTilt() < (90 - TILT_THRESHOLD);
        }
        if (args.DIRECTION === 'right') {
            return this.faceTilt() > (90 + TILT_THRESHOLD);
        }
        return false;
    }

    /**
     * A scratch command block handle that points a target to the current face tilt direction
     *
     * @param {object} args - the block arguments
     * @param {BlockUtility} util - the block utility
     */
    pointInFaceTiltDirection (args, util) {
        if (!this._currentFace) return;

        util.target.setDirection(this.faceTilt());
    }

    /**
     * A scratch command block handle that moves a target to a given facial keypoint
     *
     * @param {object} args - the block arguments
     * @param {BlockUtility} util - the block utility
     */
    goToPart (args, util) {
        if (!this._currentFace) return;

        const pos = this._getPartPosition(args.PART);
        util.target.setXY(pos.x, pos.y);
    }

    /**
     * Reset any attachments between sprites and facial keypoints.
     * @private
     */
    _clearAttachments () {
        this.runtime.targets.forEach(target => {
            const state = this._getFaceSensingState(target);
            state.attachedToPartNumber = null;
        });
    }
}

module.exports = Scratch3FaceSensingBlocks;
