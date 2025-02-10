import React from 'react';
import {renderWithIntl} from '../../helpers/intl-helpers.jsx';
import SoundEditor from '../../../src/components/sound-editor/sound-editor';
import { fireEvent } from '@testing-library/react';

describe('Sound Editor Component', () => {
    let props;
    beforeEach(() => {
        props = {
            canUndo: true,
            canRedo: false,
            chunkLevels: [1, 2, 3],
            name: 'sound name',
            playhead: 0.5,
            trimStart: 0.2,
            trimEnd: 0.8,
            onChangeName: jest.fn(),
            onDelete: jest.fn(),
            onPlay: jest.fn(),
            onRedo: jest.fn(),
            onReverse: jest.fn(),
            onSofter: jest.fn(),
            onLouder: jest.fn(),
            onRobot: jest.fn(),
            onEcho: jest.fn(),
            onFaster: jest.fn(),
            onSlower: jest.fn(),
            onSetTrimEnd: jest.fn(),
            onSetTrimStart: jest.fn(),
            onStop: jest.fn(),
            onUndo: jest.fn()
        };
    });

    test('matches snapshot', () => {
        const {container} = renderWithIntl(<SoundEditor {...props} />);
        expect(container.firstChild).toMatchSnapshot();
    });

    test('delete button appears when selection is not null', () => {
        const {container} = renderWithIntl(
            <SoundEditor
                {...props}
                trimEnd={0.75}
                trimStart={0.25}
            />
        );
        const deleteButton = [...container.querySelectorAll('div[role="button"]')]
         .find(el => el.textContent.trim() === 'Delete');

        fireEvent.click(deleteButton);
        expect(props.onDelete).toHaveBeenCalled();
    });

    test('play button appears when playhead is null', () => {
        const {container} = renderWithIntl(
            <SoundEditor
                {...props}
                playhead={null}
            />
        );
        const playButton = container.querySelector('button[title="Play"]');
        fireEvent.click(playButton);
        expect(props.onPlay).toHaveBeenCalled();
    });

    test('stop button appears when playhead is not null', () => {
        const {container} = renderWithIntl(
            <SoundEditor
                {...props}
                playhead={0.5}
            />
        );
        const stopButton = container.querySelector('button[title="Stop"]');
        fireEvent.click(stopButton);
        expect(props.onStop).toHaveBeenCalled();
    });

    //TODO THIS TEST IS FAILING
    // test('submitting name calls the callback', async () => {
    //     const onChangeName = jest.fn();
    //     const {container} = renderWithIntl(<SoundEditor {...props} onChangeName={()=>{
    //         onChangeName();
    //         console.log('onChangeName');
    //     }} />);
    
    //     const input = container.querySelector('input');
    //     console.log(input.outerHTML);
    //     fireEvent.change(input, { target: { value: 'hello' } });
    //     fireEvent.enter(input);
    
    //     await waitFor(() => expect(onChangeName).toHaveBeenCalled());
    // });

    test('effect buttons call the correct callbacks', () => {
        const {container} = renderWithIntl(
            <SoundEditor {...props} />
        );

        const buttons =  [...container.querySelectorAll('div[role="button"]')]
        const getButtonByText = (text) => buttons.find(div => div.textContent.trim() === text);
        
        const reverseButton = getButtonByText('Reverse');
        fireEvent.click(reverseButton);
        expect(props.onReverse).toHaveBeenCalled();
        
        const robotButton = getButtonByText('Robot');
        fireEvent.click(robotButton);
        expect(props.onRobot).toHaveBeenCalled();
        
        const fasterButton = getButtonByText('Faster');
        fireEvent.click(fasterButton);
        expect(props.onFaster).toHaveBeenCalled();
        
        const slowerButton = getButtonByText('Slower');
        fireEvent.click(slowerButton);
        expect(props.onSlower).toHaveBeenCalled();
        
        const louderButton = getButtonByText('Louder');
        fireEvent.click(louderButton);
        expect(props.onLouder).toHaveBeenCalled();
        
        const softerButton = getButtonByText('Softer');
        fireEvent.click(softerButton);
        expect(props.onSofter).toHaveBeenCalled();
    });

    test('undo and redo buttons can be disabled by canUndo/canRedo', () => {
        const { container: container1 } = renderWithIntl(
            <SoundEditor {...props} canUndo={true} canRedo={false} />
        );
    
        const undoButtonEnabled = container1.querySelector('button[title="Undo"]');
        const redoButtonDisabled = container1.querySelector('button[title="Redo"]');
        expect(undoButtonEnabled.disabled).toBe(false);
        expect(redoButtonDisabled.disabled).toBe(true);
    
        const { container: container2 } = renderWithIntl(<SoundEditor {...props} canUndo={false} canRedo={true} />);
    
        const undoButtonDisabled = container2.querySelector('button[title="Undo"]');
        const redoButtonEnabled = container2.querySelector('button[title="Redo"]');
        expect(undoButtonDisabled.disabled).toBe(true);
        expect(redoButtonEnabled.disabled).toBe(false);
    });
    

    test('undo/redo buttons call the correct callback', () => {
        const {container} = renderWithIntl(
            <SoundEditor
                {...props}
                canRedo
                canUndo
            />
        );
        const undoButton = container.querySelector('button[title="Undo"]');
        fireEvent.click(undoButton);
        expect(props.onUndo).toHaveBeenCalled();

        const redoButton = container.querySelector('button[title="Redo"]');
        fireEvent.click(redoButton);
        expect(props.onRedo).toHaveBeenCalled();
    });
});
