import React from 'react';
import {mountWithIntl, renderWithIntl} from '../../helpers/intl-helpers.jsx';
import configureStore from 'redux-mock-store';
import mockAudioBufferPlayer from '../../__mocks__/audio-buffer-player.js';
import mockAudioEffects from '../../__mocks__/audio-effects.js';

import SoundEditor from '../../../src/containers/sound-editor';
import SoundEditorComponent from '../../../src/components/sound-editor/sound-editor';
import {screen, fireEvent, waitFor} from '@testing-library/react';
import { act } from 'react';  // Import act


global.MutationObserver = class {
    constructor(callback) {}
    disconnect() {}
    observe() {}
};



jest.mock('react-ga');
jest.mock('../../../src/lib/audio/audio-buffer-player', () => mockAudioBufferPlayer);
jest.mock('../../../src/lib/audio/audio-effects', () => mockAudioEffects);

describe('Sound Editor Container', () => {
    const mockStore = configureStore();
    let store;
    let soundIndex;
    let soundBuffer;
    const samples = new Float32Array([0, 0, 0]); // eslint-disable-line no-undef
    let vm;

    beforeEach(() => {
        soundIndex = 0;
        soundBuffer = {
            sampleRate: 0,
            getChannelData: jest.fn(() => samples)
        };
        vm = {
            getSoundBuffer: jest.fn(() => soundBuffer),
            renameSound: jest.fn(),
            updateSoundBuffer: jest.fn(),
            editingTarget: {
                sprite: {
                    sounds: [{name: 'first name', id: 'first id'}]
                }
            }
        };
        store = mockStore({scratchGui: {vm: vm, mode: {isFullScreen: false}}});
    });

    // test('should pass the correct data to the component from the store', () => {
    //     renderWithIntl(
    //       <SoundEditor
    //         soundIndex={soundIndex}
    //         store={store}
    //       />
    //     );

    //     const inputElement = screen.getByDisplayValue('first name');
    //     expect(inputElement).toBeTruthy();
    // });
 

    // test('it plays when clicked and stops when clicked again', async () => {
    //   renderWithIntl(
    //     <SoundEditor
    //       soundIndex={soundIndex}
    //       store={store}
    //     />
    //   );
    
    //   expect(mockAudioBufferPlayer.instance.play).not.toHaveBeenCalled();
    //   expect(mockAudioBufferPlayer.instance.stop).not.toHaveBeenCalled();
    

    //   await act(async () => {
    //     const playButton = screen.getByTitle('Play');
    //     fireEvent.click(playButton);
    //   });
    //   expect(mockAudioBufferPlayer.instance.play).toHaveBeenCalled();
    
    // //   const stopButton = await waitFor(() => screen.getByTitle('Stop'));
    // //   await act(async () => {
    // //     fireEvent.click(stopButton);
    // //   });
    // //   expect(mockAudioBufferPlayer.instance.stop).toHaveBeenCalled();
    // });

    // test('it submits name changes to the vm', () => {
    //     renderWithIntl(
    //         <SoundEditor
    //           soundIndex={soundIndex}
    //           store={store}
    //         />
    //       );
        
    //     const nameInput = screen.getByRole('textbox');
    //     fireEvent.change(nameInput, { target: { value: 'hello' } });
    //     fireEvent.keyPress(nameInput, { key: 'Enter', code: 'Enter', charCode: 13 });        
    //     expect(vm.renameSound).toHaveBeenCalledWith(soundIndex, 'hello');
    // });

    // test('it handles an effect by submitting the result and playing', async () => {
    //     renderWithIntl(
    //         <SoundEditor
    //             soundIndex={soundIndex}
    //             store={store}
    //         />
    //     );
    //    const reverseButton = screen.getByRole('button', { name: "Reverse" });
    //    fireEvent.click(reverseButton);
    //     await mockAudioEffects.instance._finishProcessing(soundBuffer);
    //     expect(mockAudioBufferPlayer.instance.play).toHaveBeenCalled();
    //     expect(vm.updateSoundBuffer).toHaveBeenCalled();
    // });

    // test('it handles reverse effect correctly', () => {
    //     renderWithIntl(
    //         <SoundEditor
    //             soundIndex={soundIndex}
    //             store={store}
    //         />
    //     );
    //     const reverseButton = screen.getByRole('button', { name: "Reverse" });
    //     fireEvent.click(reverseButton);
    //     expect(mockAudioEffects.instance.name).toEqual(mockAudioEffects.effectTypes.REVERSE);
    //     expect(mockAudioEffects.instance.process).toHaveBeenCalled();
    // });

    // test('it handles louder effect correctly', () => {
    //     renderWithIntl(
    //         <SoundEditor
    //             soundIndex={soundIndex}
    //             store={store}
    //         />
    //     );
    //     const louderButton = screen.getByRole('button', { name: "Louder" });
    //     fireEvent.click(louderButton);
    //     expect(mockAudioEffects.instance.name).toEqual(mockAudioEffects.effectTypes.LOUDER);
    //     expect(mockAudioEffects.instance.process).toHaveBeenCalled();
    // });

    // test('it handles softer effect correctly', () => {
    //     renderWithIntl(
    //         <SoundEditor
    //             soundIndex={soundIndex}
    //             store={store}
    //         />
    //     );
    //     const softerButton = screen.getByRole('button', { name: "Softer" });
    //     fireEvent.click(softerButton);
    //     expect(mockAudioEffects.instance.name).toEqual(mockAudioEffects.effectTypes.SOFTER);
    //     expect(mockAudioEffects.instance.process).toHaveBeenCalled();
    // });

    // test('it handles faster effect correctly', () => {
    //     renderWithIntl(
    //         <SoundEditor
    //             soundIndex={soundIndex}
    //             store={store}
    //         />
    //     );
    //     const fasterButton = screen.getByRole('button', { name: "Faster" });
    //     fireEvent.click(fasterButton);
    //     expect(mockAudioEffects.instance.name).toEqual(mockAudioEffects.effectTypes.FASTER);
    //     expect(mockAudioEffects.instance.process).toHaveBeenCalled();
    // });

    // test('it handles slower effect correctly', () => {
    //     renderWithIntl(
    //         <SoundEditor
    //             soundIndex={soundIndex}
    //             store={store}
    //         />
    //     );
    //     const slowerButton = screen.getByRole('button', { name: "Slower" });
    //     fireEvent.click(slowerButton);
    //     expect(mockAudioEffects.instance.name).toEqual(mockAudioEffects.effectTypes.SLOWER);
    //     expect(mockAudioEffects.instance.process).toHaveBeenCalled();
    // });

    test('it handles robot effect correctly', () => {
        renderWithIntl(
            <SoundEditor
                soundIndex={soundIndex}
                store={store}
            />
        );
        const softerButton = screen.getByRole('button', { name: "Robot" });
        fireEvent.click(softerButton);
        expect(mockAudioEffects.instance.name).toEqual(mockAudioEffects.effectTypes.ROBOT);
        expect(mockAudioEffects.instance.process).toHaveBeenCalled();
    });

    // ТODO - rewrite this test
    test('undo/redo stack state', async () => {
        const wrapper = mountWithIntl(
            <SoundEditor
                soundIndex={soundIndex}
                store={store}
            />
        );
        let component = wrapper.find(SoundEditorComponent);
        // Undo and redo should be disabled initially
        expect(component.prop('canUndo')).toEqual(false);
        expect(component.prop('canRedo')).toEqual(false);

        // Submitting new samples should make it possible to undo
        component.props().onFaster();
        await mockAudioEffects.instance._finishProcessing(soundBuffer);
        wrapper.update();
        component = wrapper.find(SoundEditorComponent);
        expect(component.prop('canUndo')).toEqual(true);
        expect(component.prop('canRedo')).toEqual(false);

        // Undoing should make it possible to redo and not possible to undo again
        await component.props().onUndo();
        wrapper.update();
        component = wrapper.find(SoundEditorComponent);
        expect(component.prop('canUndo')).toEqual(false);
        expect(component.prop('canRedo')).toEqual(true);

        // Redoing should make it possible to undo and not possible to redo again
        await component.props().onRedo();
        wrapper.update();
        component = wrapper.find(SoundEditorComponent);
        expect(component.prop('canUndo')).toEqual(true);
        expect(component.prop('canRedo')).toEqual(false);

        // New submission should clear the redo stack
        await component.props().onUndo(); // Undo to go back to a state where redo is enabled
        wrapper.update();
        component = wrapper.find(SoundEditorComponent);
        expect(component.prop('canRedo')).toEqual(true);
        component.props().onFaster();
        await mockAudioEffects.instance._finishProcessing(soundBuffer);

        wrapper.update();
        component = wrapper.find(SoundEditorComponent);
        expect(component.prop('canRedo')).toEqual(false);
    });

    // ТODO - rewrite this test
    test('undo and redo submit new samples and play the sound', async () => {
        const wrapper = mountWithIntl(
            <SoundEditor
                soundIndex={soundIndex}
                store={store}
            />
        );
        let component = wrapper.find(SoundEditorComponent);

        // Set up an undoable state
        component.props().onFaster();
        await mockAudioEffects.instance._finishProcessing(soundBuffer);
        wrapper.update();
        component = wrapper.find(SoundEditorComponent);

        // Undo should update the sound buffer and play the new samples
        await component.props().onUndo();
        expect(mockAudioBufferPlayer.instance.play).toHaveBeenCalled();
        expect(vm.updateSoundBuffer).toHaveBeenCalled();

        // Clear the mocks call history to assert again for redo.
        vm.updateSoundBuffer.mockClear();
        mockAudioBufferPlayer.instance.play.mockClear();

        // Undo should update the sound buffer and play the new samples
        await component.props().onRedo();
        expect(mockAudioBufferPlayer.instance.play).toHaveBeenCalled();
        expect(vm.updateSoundBuffer).toHaveBeenCalled();
    });
});
