import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import DefaultMonitor from '../../../src/components/monitor/default-monitor';
import Monitor from '../../../src/components/monitor/monitor';
import {DARK_THEME, DEFAULT_THEME} from '../../../src/lib/themes';

jest.mock('../../../src/lib/themes/default');
jest.mock('../../../src/lib/themes/dark');

describe('Monitor Component', () => {
    test('it selects the correct colors based on default theme', () => {
        const noop = () => {};

        const {container} = render(<Monitor
            category="motion"
            // eslint-disable-next-line react/jsx-no-bind
            componentRef={noop}
            draggable={false}
            label="My label"
            mode="default"
            // eslint-disable-next-line react/jsx-no-bind
            onDragEnd={noop}
            // eslint-disable-next-line react/jsx-no-bind
            onNextMode={noop}
            theme={DEFAULT_THEME}
        />);
        
        // selects colors from mock value in src/lib/themes/__mocks__/default-colors.js
        const backgroudColorDiv = container.querySelector('div[style*="background: rgb(17, 17, 17)"]');
        expect(backgroudColorDiv).toBeTruthy();        
        const textColorDiv = container.querySelector('div[style*="color: rgb(68, 68, 68)"]');
        expect(textColorDiv).toBeTruthy();     
    });

    test('it selects the correct colors based on dark mode theme', () => {
        const noop = () => {};

        const {container} = render(<Monitor
            category="motion"
            // eslint-disable-next-line react/jsx-no-bind
            componentRef={noop}
            draggable={false}
            label="My label"
            mode="default"
            // eslint-disable-next-line react/jsx-no-bind
            onDragEnd={noop}
            // eslint-disable-next-line react/jsx-no-bind
            onNextMode={noop}
            theme={DARK_THEME}
        />);

        console.log(container.innerHTML);

        const backgroudColorDiv = container.querySelector('div[style*="background: rgb(170, 170, 170)"]');
        expect(backgroudColorDiv).toBeTruthy();        
        const textColorDiv = container.querySelector('div[style*="color: rgb(187, 187, 187)"]');
        expect(textColorDiv).toBeTruthy();  
    });
});
