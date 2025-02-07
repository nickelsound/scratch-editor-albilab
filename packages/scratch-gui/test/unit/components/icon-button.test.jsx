import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import IconButton from '../../../src/components/icon-button/icon-button';

describe('IconButtonComponent', () => {
    const defaultProps = {
        img: 'imgSrc',
        title: <div>Text</div>,
        onClick: ()=>{},
        className: 'custom-class-name'
    };

    test('renders with all props correctly', () => {
        const { container } = render(<IconButton {...defaultProps} />);

        const button = container.querySelector('div[role="button"]');
        expect(button).toBeTruthy();
        expect(button).toHaveClass('custom-class-name');

        const image = container.querySelector('img');
        expect(image).toBeTruthy();
        expect(image).toHaveAttribute('src','imgSrc');
        expect(image).toHaveAttribute('draggable','false');

        const text = container.querySelector('div div div');
        expect(text).toHaveTextContent('Text');
    });

    test('triggers callback only once when clicked', () => {
        const onClick = jest.fn();

        const { container } = render(
            <IconButton 
                {...defaultProps} 
                onClick={onClick} 
            />
        );

        const button = container.querySelector('div[role="button"]');

        fireEvent.click(button);

        expect(onClick).toHaveBeenCalledTimes(1);
    });
});