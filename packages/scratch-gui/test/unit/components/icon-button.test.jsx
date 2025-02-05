import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import IconButton from '../../../src/components/icon-button/icon-button';

describe('IconButtonComponent', () => {
    test('matches snapshot', () => {
        const onClick = jest.fn();
        const title = <div>Text</div>;
        const imgSrc = 'imgSrc';
        const className = 'custom-class-name';
        
        const { asFragment } = render(
            <IconButton
                className={className}
                img={imgSrc}
                title={title}
                onClick={onClick}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });

    test('triggers callback when clicked', () => {
        const onClick = jest.fn();
        const title = <div>Text</div>;
        const imgSrc = 'imgSrc';
        
        render(
            <IconButton
                img={imgSrc}
                title={title}
                onClick={onClick}
            />
        );
        
        const button = screen.getByRole('button');
        fireEvent.click(button);
        expect(onClick).toHaveBeenCalled();
    });
});
