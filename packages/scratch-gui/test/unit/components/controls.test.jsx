import React from 'react';
import { fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { renderWithIntl } from '../../helpers/intl-helpers.jsx';
import Controls from '../../../src/components/controls/controls';

describe('Controls component', () => {
    const defaultProps = () => ({
        active: false,
        onGreenFlagClick: jest.fn(),
        onStopAllClick: jest.fn(),
        turbo: false
    });

    test('shows turbo mode when in turbo mode', () => {
        const { container: containerNoTurbo } = renderWithIntl(<Controls {...defaultProps()} />);
        const noTurboMode = [...containerNoTurbo.querySelectorAll('div')].reverse().find(el => el.textContent.includes('Turbo Mode'));
        expect(noTurboMode).toBeFalsy();
        
        const { container: containerTurbo } = renderWithIntl(<Controls {...defaultProps()} turbo={true} />);
        const turboMode = [...containerTurbo.querySelectorAll('div')].reverse().find(el => el.textContent.includes('Turbo Mode'));
        expect(turboMode).toBeTruthy();
    });

    test('triggers the right callbacks when clicked', () => {
        const props = defaultProps();
        const { container } = renderWithIntl(<Controls {...props} />);
    
        const greenFlagButton = container.querySelector('img[title="Go"]');
        const stopAllButton = container.querySelector('img[title="Stop"]');
    
        fireEvent.click(greenFlagButton);
        expect(props.onGreenFlagClick).toHaveBeenCalled();
    
        fireEvent.click(stopAllButton);
        expect(props.onStopAllClick).toHaveBeenCalled();
    });
});