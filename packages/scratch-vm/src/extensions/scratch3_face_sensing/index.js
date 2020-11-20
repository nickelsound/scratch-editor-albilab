const ArgumentType = require('../../extension-support/argument-type');
const BlockType = require('../../extension-support/block-type');
const Clone = require('../../util/clone');
const MathUtil = require('../../util/math-util');
const formatMessage = require('format-message');
const Video = require('../../io/video');
// const Posenet = require('@tensorflow-models/posenet');

const Blazeface = require('@tensorflow-models/blazeface');
// import * as Blazeface from '@tensorflow-models/blazeface';

/**
 * Icon svg to be displayed in the blocks category menu, encoded as a data URI.
 * @type {string}
 */
// eslint-disable-next-line max-len
const menuIconURI = 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyB3aWR0aD0iMjBweCIgaGVpZ2h0PSIyMHB4IiB2aWV3Qm94PSIwIDAgMjAgMjAiIHZlcnNpb249IjEuMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayI+CiAgICA8IS0tIEdlbmVyYXRvcjogU2tldGNoIDUyLjIgKDY3MTQ1KSAtIGh0dHA6Ly93d3cuYm9oZW1pYW5jb2RpbmcuY29tL3NrZXRjaCAtLT4KICAgIDx0aXRsZT5FeHRlbnNpb25zL1NvZnR3YXJlL1ZpZGVvLVNlbnNpbmctTWVudTwvdGl0bGU+CiAgICA8ZGVzYz5DcmVhdGVkIHdpdGggU2tldGNoLjwvZGVzYz4KICAgIDxnIGlkPSJFeHRlbnNpb25zL1NvZnR3YXJlL1ZpZGVvLVNlbnNpbmctTWVudSIgc3Ryb2tlPSJub25lIiBzdHJva2Utd2lkdGg9IjEiIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0iZXZlbm9kZCI+CiAgICAgICAgPGcgaWQ9InZpZGVvLW1vdGlvbiIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMC4wMDAwMDAsIDUuMDAwMDAwKSIgZmlsbC1ydWxlPSJub256ZXJvIj4KICAgICAgICAgICAgPGNpcmNsZSBpZD0iT3ZhbC1Db3B5IiBmaWxsPSIjMEVCRDhDIiBvcGFjaXR5PSIwLjI1IiBjeD0iMTYiIGN5PSI4IiByPSIyIj48L2NpcmNsZT4KICAgICAgICAgICAgPGNpcmNsZSBpZD0iT3ZhbC1Db3B5IiBmaWxsPSIjMEVCRDhDIiBvcGFjaXR5PSIwLjUiIGN4PSIxNiIgY3k9IjYiIHI9IjIiPjwvY2lyY2xlPgogICAgICAgICAgICA8Y2lyY2xlIGlkPSJPdmFsLUNvcHkiIGZpbGw9IiMwRUJEOEMiIG9wYWNpdHk9IjAuNzUiIGN4PSIxNiIgY3k9IjQiIHI9IjIiPjwvY2lyY2xlPgogICAgICAgICAgICA8Y2lyY2xlIGlkPSJPdmFsIiBmaWxsPSIjMEVCRDhDIiBjeD0iMTYiIGN5PSIyIiByPSIyIj48L2NpcmNsZT4KICAgICAgICAgICAgPHBhdGggZD0iTTExLjMzNTk3MzksMi4yMDk3ODgyNSBMOC4yNSw0LjIwOTk1NjQ5IEw4LjI1LDMuMDUgQzguMjUsMi4wNDQ4ODIyNyA3LjQ2ODU5MDMxLDEuMjUgNi41LDEuMjUgTDIuMDUsMS4yNSBDMS4wMzgwNzExOSwxLjI1IDAuMjUsMi4wMzgwNzExOSAwLjI1LDMuMDUgTDAuMjUsNyBDMC4yNSw3Ljk2MzY5OTM3IDEuMDQyMjQ5MTksOC43NTU5NDg1NiAyLjA1LDguOCBMNi41LDguOCBDNy40NTA4MzAwOSw4LjggOC4yNSw3Ljk3MzI3MjUgOC4yNSw3IEw4LjI1LDUuODU4NDUyNDEgTDguNjI4NjIzOTQsNi4wODU2MjY3NyBMMTEuNDI2Nzc2Nyw3Ljc3MzIyMzMgQzExLjQzNjg5NDMsNy43ODMzNDA5MSAxMS40NzU3NjU1LDcuOCAxMS41LDcuOCBDMTEuNjMzNDkzMiw3LjggMTEuNzUsNy42OTEyNjAzNCAxMS43NSw3LjU1IEwxMS43NSwyLjQgQzExLjc1LDIuNDE4MzgyNjkgMTEuNzIxOTAyOSwyLjM1MjgyMjgyIDExLjY4NTYyNjgsMi4yNzg2MjM5NCBDMTEuNjEyOTUyOCwyLjE1NzUwMDY5IDExLjQ3MDc5NjgsMi4xMjkwNjk1IDExLjMzNTk3MzksMi4yMDk3ODgyNSBaIiBpZD0idmlkZW9fMzdfIiBzdHJva2Utb3BhY2l0eT0iMC4xNSIgc3Ryb2tlPSIjMDAwMDAwIiBzdHJva2Utd2lkdGg9IjAuNSIgZmlsbD0iIzRENEQ0RCI+PC9wYXRoPgogICAgICAgIDwvZz4KICAgIDwvZz4KPC9zdmc+';

/**
 * Icon svg to be displayed at the left edge of each extension block, encoded as a data URI.
 * @type {string}
 */
// eslint-disable-next-line max-len
const blockIconURI = 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyB3aWR0aD0iNDBweCIgaGVpZ2h0PSI0MHB4IiB2aWV3Qm94PSIwIDAgNDAgNDAiIHZlcnNpb249IjEuMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayI+CiAgICA8IS0tIEdlbmVyYXRvcjogU2tldGNoIDUyLjIgKDY3MTQ1KSAtIGh0dHA6Ly93d3cuYm9oZW1pYW5jb2RpbmcuY29tL3NrZXRjaCAtLT4KICAgIDx0aXRsZT5FeHRlbnNpb25zL1NvZnR3YXJlL1ZpZGVvLVNlbnNpbmctQmxvY2s8L3RpdGxlPgogICAgPGRlc2M+Q3JlYXRlZCB3aXRoIFNrZXRjaC48L2Rlc2M+CiAgICA8ZyBpZD0iRXh0ZW5zaW9ucy9Tb2Z0d2FyZS9WaWRlby1TZW5zaW5nLUJsb2NrIiBzdHJva2U9Im5vbmUiIHN0cm9rZS13aWR0aD0iMSIgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIiBzdHJva2Utb3BhY2l0eT0iMC4xNSI+CiAgICAgICAgPGcgaWQ9InZpZGVvLW1vdGlvbiIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMC4wMDAwMDAsIDEwLjAwMDAwMCkiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjMDAwMDAwIj4KICAgICAgICAgICAgPGNpcmNsZSBpZD0iT3ZhbC1Db3B5IiBmaWxsPSIjRkZGRkZGIiBvcGFjaXR5PSIwLjI1IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGN4PSIzMiIgY3k9IjE2IiByPSI0LjUiPjwvY2lyY2xlPgogICAgICAgICAgICA8Y2lyY2xlIGlkPSJPdmFsLUNvcHkiIGZpbGw9IiNGRkZGRkYiIG9wYWNpdHk9IjAuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBjeD0iMzIiIGN5PSIxMiIgcj0iNC41Ij48L2NpcmNsZT4KICAgICAgICAgICAgPGNpcmNsZSBpZD0iT3ZhbC1Db3B5IiBmaWxsPSIjRkZGRkZGIiBvcGFjaXR5PSIwLjc1IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGN4PSIzMiIgY3k9IjgiIHI9IjQuNSI+PC9jaXJjbGU+CiAgICAgICAgICAgIDxjaXJjbGUgaWQ9Ik92YWwiIGZpbGw9IiNGRkZGRkYiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgY3g9IjMyIiBjeT0iNCIgcj0iNC41Ij48L2NpcmNsZT4KICAgICAgICAgICAgPHBhdGggZD0iTTIyLjY3MTk0NzcsNC40MTk1NzY0OSBMMTYuNSw4LjQxOTkxMjk4IEwxNi41LDYuMSBDMTYuNSw0LjA4OTc2NDU0IDE0LjkzNzE4MDYsMi41IDEzLDIuNSBMNC4xLDIuNSBDMi4wNzYxNDIzNywyLjUgMC41LDQuMDc2MTQyMzcgMC41LDYuMSBMMC41LDE0IEMwLjUsMTUuOTI3Mzk4NyAyLjA4NDQ5ODM5LDE3LjUxMTg5NzEgNC4xLDE3LjYgTDEzLDE3LjYgQzE0LjkwMTY2MDIsMTcuNiAxNi41LDE1Ljk0NjU0NSAxNi41LDE0IEwxNi41LDExLjcxNjkwNDggTDIyLjc1NzI0NzksMTUuNDcxMjUzNSBMMjIuODUzNTUzNCwxNS41NDY0NDY2IEMyMi44NzM3ODg2LDE1LjU2NjY4MTggMjIuOTUxNTMxLDE1LjYgMjMsMTUuNiBDMjMuMjY2OTg2NSwxNS42IDIzLjUsMTUuMzgyNTIwNyAyMy41LDE1LjEgTDIzLjUsNC44IEMyMy41LDQuODM2NzY1MzggMjMuNDQzODA1OCw0LjcwNTY0NTYzIDIzLjM3MTI1MzUsNC41NTcyNDc4OCBDMjMuMjI1OTA1Niw0LjMxNTAwMTM5IDIyLjk0MTU5MzcsNC4yNTgxMzg5OSAyMi42NzE5NDc3LDQuNDE5NTc2NDkgWiIgaWQ9InZpZGVvXzM3XyIgZmlsbD0iIzRENEQ0RCI+PC9wYXRoPgogICAgICAgIDwvZz4KICAgIDwvZz4KPC9zdmc+';

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

        Blazeface.load().then(model => {
            this.blazeface = model;
            if (this.runtime.ioDevices) {
                // Kick off looping the analysis logic.
                this._loop();
            }
        });

        this.currentPose = null;

        /**
         * The last millisecond epoch timestamp that the video stream was
         * analyzed.
         * @type {number}
         */
        this._lastUpdate = null;

        this._clearAttachments = this._clearAttachments.bind(this);
        this.runtime.on('PROJECT_STOP_ALL', this._clearAttachments);
    }

    /**
     * After analyzing a frame the amount of milliseconds until another frame
     * is analyzed.
     * @type {number}
     */
    static get INTERVAL () {
        return 33;
    }

    /**
     * Dimensions the video stream is analyzed at after its rendered to the
     * sample canvas.
     * @type {Array.<number>}
     */
    static get DIMENSIONS () {
        return [480, 360];
    }

    /**
     * Reset the extension's data motion detection data. This will clear out
     * for example old frames, so the first analyzed frame will not be compared
     * against a frame from before reset was called.
     */
    reset () {

    }

    /**
     * Occasionally step a loop to sample the video, stamp it to the preview
     * skin, and add a TypedArray copy of the canvas's pixel data.
     * @private
     */
    _loop () {
        setTimeout(this._loop.bind(this), Math.max(this.runtime.currentStepTime, Scratch3FaceSensingBlocks.INTERVAL));

        const time = Date.now();
        if (this._lastUpdate === null) {
            this._lastUpdate = time;
        }
        const offset = time - this._lastUpdate;
        if (offset > Scratch3FaceSensingBlocks.INTERVAL) {
            const frame = this.runtime.ioDevices.video.getFrame({
                format: Video.FORMAT_IMAGE_DATA,
                dimensions: Scratch3FaceSensingBlocks.DIMENSIONS
            });
            if (frame) {
                this.blazeface.estimateFaces(frame, false).then(faces => {
                    if (faces) {
                        this.currentFace = faces[0];
                    }
                    this._lastUpdate = time;
                });
            }
        }
    }

    _getFaceSensingState (target) {
        let faceSensingState = target.getCustomState(Scratch3FaceSensingBlocks.STATE_KEY);
        if (!faceSensingState) {
            faceSensingState = Clone.simple(Scratch3FaceSensingBlocks.DEFAULT_FACE_SENSING_STATE);
            target.setCustomState(Scratch3FaceSensingBlocks.STATE_KEY, faceSensingState);
        }
        return faceSensingState;
    }

    static get STATE_KEY () {
        return 'Scratch.faceSensing';
    }

    static get DEFAULT_FACE_SENSING_STATE () {
        return {
            attachedToPartNumber: null,
            prevX: 0,
            offsetX: 0,
            prevY: 0,
            offsetY: 0,
            prevSize: 100,
            offsetSize: 0,
            prevDirection: 0,
            offsetDirection: 0
        };
    }

    /**
     * @returns {object} metadata for this extension and its blocks.
     */
    getInfo () {
        // Enable the video layer
        this.runtime.ioDevices.video.enableVideo();

        // Return extension definition
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
                    opcode: 'whenFaceDetected',
                    text: formatMessage({
                        id: 'faceSensing.whenFaceDetected',
                        default: 'when a face is detected',
                        description: ''
                    }),
                    blockType: BlockType.HAT
                },
                {
                    opcode: 'whenSpriteTouchesFace',
                    text: formatMessage({
                        id: 'faceSensing.whenSpriteTouchesFace',
                        default: 'when face touches this sprite',
                        description: ''
                    }),
                    blockType: BlockType.HAT
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
                '---',
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
                    }
                },
                {
                    opcode: 'pointInFaceTiltDirection',
                    text: formatMessage({
                        id: 'faceSensing.pointInFaceTiltDirection',
                        default: 'point in direction of face tilt',
                        description: ''
                    }),
                    blockType: BlockType.COMMAND
                },
                {
                    opcode: 'setSizeToFaceSize',
                    text: formatMessage({
                        id: 'faceSensing.setSizeToFaceSize',
                        default: 'set size to face size',
                        description: ''
                    }),
                    blockType: BlockType.COMMAND
                },
                '---',
                {
                    opcode: 'faceIsDetected',
                    text: formatMessage({
                        id: 'faceSensing.faceDetected',
                        default: 'face is detected?',
                        description: ''
                    }),
                    blockType: BlockType.BOOLEAN
                },
                // {
                //     opcode: 'attachToPart',
                //     text: formatMessage({
                //         id: 'faceSensing.attachToPart',
                //         default: 'attach to [PART]',
                //         description: ''
                //     }),
                //     blockType: BlockType.COMMAND,
                //     arguments: {
                //         PART: {
                //             type: ArgumentType.STRING,
                //             menu: 'PART',
                //             defaultValue: '2'
                //         }
                //     }
                // },
                {
                    opcode: 'faceTilt',
                    text: formatMessage({
                        id: 'faceSensing.faceTilt',
                        default: 'face tilt',
                        description: ''
                    }),
                    blockType: BlockType.REPORTER
                },
                // {
                //     opcode: 'partX',
                //     text: formatMessage({
                //         id: 'faceSensing.partX',
                //         default: 'x position of [PART]',
                //         description: ''
                //     }),
                //     arguments: {
                //         PART: {
                //             type: ArgumentType.NUMBER,
                //             menu: 'PART',
                //             defaultValue: '2'
                //         }
                //     },
                //     blockType: BlockType.REPORTER
                // },
                // {
                //     opcode: 'partY',
                //     text: formatMessage({
                //         id: 'faceSensing.partY',
                //         default: 'y position of [PART]',
                //         description: ''
                //     }),
                //     arguments: {
                //         PART: {
                //             type: ArgumentType.NUMBER,
                //             menu: 'PART',
                //             defaultValue: '2'
                //         }
                //     },
                //     blockType: BlockType.REPORTER
                // },
                {
                    opcode: 'faceSize',
                    text: formatMessage({
                        id: 'faceSensing.faceSize',
                        default: 'face size',
                        description: ''
                    }),
                    blockType: BlockType.REPORTER
                }
                // {
                //     opcode: 'probability',
                //     text: formatMessage({
                //         id: 'faceSensing.probability',
                //         default: 'probability of face detection',
                //         description: ''
                //     }),
                //     blockType: BlockType.REPORTER
                // },
                // {
                //     opcode: 'numberOfFaces',
                //     text: formatMessage({
                //         id: 'faceSensing.numberOfFaces',
                //         default: 'number of faces',
                //         description: ''
                //     }),
                //     blockType: BlockType.REPORTER
                // }
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

    getBetweenEyesPosition () {
        // center point of a line between the eyes
        const leftEye = this.getPartPosition(0);
        const rightEye = this.getPartPosition(1);
        const betweenEyes = {x: 0, y: 0};
        betweenEyes.x = leftEye.x + ((rightEye.x - leftEye.x) / 2);
        betweenEyes.y = leftEye.y + ((rightEye.y - leftEye.y) / 2);
        return betweenEyes;
    }

    getTopOfHeadPosition () {
        // Estimated top of the head point:
        // Make a line perpendicular to the line between the eyes, through
        // its center, and move upward along it the distance from the point
        // between the eyes to the mouth.
        const leftEyePos = this.getPartPosition(0);
        const rightEyePos = this.getPartPosition(1);
        const mouthPos = this.getPartPosition(3);
        const dx = rightEyePos.x - leftEyePos.x;
        const dy = rightEyePos.y - leftEyePos.y;
        const directionRads = Math.atan2(dy, dx) + (Math.PI / 2);
        const betweenEyesPos = this.getBetweenEyesPosition();
        const mouthDistance = this.distance(betweenEyesPos, mouthPos);

        const topOfHeadPosition = {x: 0, y: 0};
        topOfHeadPosition.x = betweenEyesPos.x + (mouthDistance * Math.cos(directionRads));
        topOfHeadPosition.y = betweenEyesPos.y + (mouthDistance * Math.sin(directionRads));

        return topOfHeadPosition;
    }

    distance (pointA, pointB) {
        const dx = pointA.x - pointB.x;
        const dy = pointA.y - pointB.y;
        return Math.sqrt((dx * dx) + (dy * dy));
    }

    whenSpriteTouchesFace (args, util) {
        if (!this.currentFace) return false;
        if (!this.currentFace.topLeft) return false;
        const topLeft = this.toScratchCoords(this.currentFace.topLeft);
        const bottomRight = this.toScratchCoords(this.currentFace.bottomRight);
        return util.target.isTouchingRect(topLeft.x, topLeft.y, bottomRight.x, bottomRight.y);
    }

    whenFaceDetected () {
        return this.currentFace;
    }

    faceIsDetected () {
        return !!this.currentFace;
    }

    numberOfFaces () {
        return this.allFaces.length;
    }

    probability () {
        if (this.currentFace) {
            return Math.round(this.currentFace.probability * 100);
        }
        return 0;
    }

    faceSize () {
        if (this.currentFace) {
            return Math.round(this.currentFace.bottomRight[0] - this.currentFace.topLeft[0]);
        }
        return 100;
    }

    getPartPosition (part) {
        const defaultPos = {x: 0, y: 0};
        if (!this.currentFace) return defaultPos;
        if (!this.currentFace.landmarks) return defaultPos;
        if (Number(part) === 6) {
            return this.getBetweenEyesPosition();
        }
        if (Number(part) === 7) {
            return this.getTopOfHeadPosition();
        }
        const result = this.currentFace.landmarks[Number(part)];
        if (result) {
            return this.toScratchCoords(result);
        }
        return defaultPos;
    }

    toScratchCoords (position) {
        return {
            x: position[0] - 240,
            y: 180 - position[1]
        };
    }

    partX (args) {
        return this.getPartPosition(args.PART).x;
    }

    partY (args) {
        return this.getPartPosition(args.PART).y;
    }

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

    goToPart (args, util) {
        const pos = this.getPartPosition(args.PART);
        util.target.setXY(pos.x, pos.y);
    }

    pointInFaceTiltDirection (args, util) {
        util.target.setDirection(this.faceTilt());
    }

    setSizeToFaceSize (args, util) {
        util.target.setSize(this.faceSize());
    }

    attachToPart (args, util) {
        const state = this._getFaceSensingState(util.target);
        state.attachedToPartNumber = args.PART;
        state.offsetX = 0;
        state.offsetY = 0;
        state.prevX = util.target.x;
        state.prevY = util.target.y;
        state.offsetDirection = 0;
        state.prevDirection = util.target.direction;
        state.offsetSize = 0;
        state.prevSize = util.target.size;
    }

    updateAttachments () {
        this.runtime.targets.forEach(target => {
            const state = this._getFaceSensingState(target);
            if (state.attachedToPartNumber) {
                const partPos = this.getPartPosition(state.attachedToPartNumber);
                if (target.x !== state.prevX) {
                    state.offsetX += target.x - state.prevX;
                }
                if (target.y !== state.prevY) {
                    state.offsetY += target.y - state.prevY;
                }
                if (target.direction !== state.prevDirection) {
                    state.offsetDirection += target.direction - state.prevDirection;
                }
                if (target.size !== state.prevSize) {
                    state.offsetSize += target.size - state.prevSize;
                }
                target.setXY(partPos.x + state.offsetX, partPos.y + state.offsetY);
                target.setDirection(this.faceTilt() + state.offsetDirection);
                target.setSize(this.faceSize() + state.offsetSize);
                state.prevX = target.x;
                state.prevY = target.y;
                state.prevDirection = target.direction;
                state.prevSize = target.size;
            }
        });
    }

    _clearAttachments () {
        this.runtime.targets.forEach(target => {
            const state = this._getFaceSensingState(target);
            state.attachedToPartNumber = null;
        });
    }

    faceTilt () {
        const leftEyePos = this.getPartPosition(0);
        const rightEyePos = this.getPartPosition(1);
        const dx = rightEyePos.x - leftEyePos.x;
        const dy = rightEyePos.y - leftEyePos.y;
        const direction = 90 - MathUtil.radToDeg(Math.atan2(dy, dx));
        return Math.round(direction);
    }
}

module.exports = Scratch3FaceSensingBlocks;
