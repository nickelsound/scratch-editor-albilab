import React from 'react';
import ToggleButtons from '../../../src/components/toggle-buttons/toggle-buttons';
import { fireEvent, render } from '@testing-library/react';


describe('ToggleButtons', () => {
    test('renders multiple buttons', () => {
        const {container} = render(<ToggleButtons
            buttons={[
                {
                    title: 'Button 1',
                    handleClick: () => {},
                    icon: 'Button 1 icon'
                },
                {
                    title: 'Button 2',
                    handleClick: () => {},
                    icon: 'Button 2 icon'
                }
            ]}
        />);

        console.log(container.innerHTML);

        const buttons = container.querySelectorAll('button');

        expect(buttons).toHaveLength(2);
        expect(buttons[0].getAttribute('title')).toBe('Button 1');
        expect(buttons[1].getAttribute('title')).toBe('Button 2');
    });

    test('calls correct click handler', () => {
        const onClick1 = jest.fn();
        const onClick2 = jest.fn();
        const {container} = render(<ToggleButtons
            buttons={[
                {
                    title: 'Button 1',
                    handleClick: onClick1,
                    icon: 'Button 1 icon'
                },
                {
                    title: 'Button 2',
                    handleClick: onClick2,
                    icon: 'Button 2 icon'
                }
            ]}
        />);
        const button2 = container.querySelector('button[title="Button 2"]');
        fireEvent.click(button2);
        
        expect(onClick2).toHaveBeenCalled();
        expect(onClick1).not.toHaveBeenCalled();
    });
});
