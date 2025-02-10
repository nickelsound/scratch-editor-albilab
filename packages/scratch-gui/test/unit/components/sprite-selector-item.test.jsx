import React from 'react';
import {renderWithIntl} from '../../helpers/intl-helpers.jsx';
import SpriteSelectorItemComponent from '../../../src/components/sprite-selector-item/sprite-selector-item';
import { fireEvent } from '@testing-library/react';

describe('SpriteSelectorItemComponent', () => {
    let className;
    let costumeURL;
    let name;
    let onClick;
    let onDeleteButtonClick;
    let selected;
    let number;
    let details;

    // Wrap this in a function so it gets test specific states and can be reused.
    const getComponent = function () {
        return (
            <SpriteSelectorItemComponent
                className={className}
                costumeURL={costumeURL}
                details={details}
                name={name}
                number={number}
                selected={selected}
                onClick={onClick}
                onDeleteButtonClick={onDeleteButtonClick}
            />
        );
    };

    beforeEach(() => {
        className = 'ponies';
        costumeURL = 'https://scratch.mit.edu/foo/bar/pony';
        name = 'Pony sprite';
        onClick = jest.fn();
        onDeleteButtonClick = jest.fn();
        selected = true;
        // Reset to undefined since they are optional props
        number = undefined; // eslint-disable-line no-undefined
        details = undefined; // eslint-disable-line no-undefined
    });

    // test('matches snapshot when selected', () => {
    //     const {container} = renderWithIntl(getComponent());
    //     expect(container.firstChild).toMatchSnapshot();
    // });

    // test('matches snapshot when given a number and details to show', () => {
    //     number = 5;
    //     details = '480 x 360';
    //     const {container} = renderWithIntl(getComponent());
    //     expect(container.firstChild).toMatchSnapshot();
    // });

    // test('does not have a close box when not selected', () => {
    //     const {container} = renderWithIntl(getComponent());
    //     console.log(container.innerHTML);
    //     expect(wrapper.find(DeleteButton).exists()).toBe(false);
    // });

    // test('triggers callback when Box component is clicked', () => {
    //     const wrapper = renderWithIntl(getComponent());
    //     wrapper.simulate('click');
    //     expect(onClick).toHaveBeenCalled();
    // });

    // test('triggers callback when CloseButton component is clicked', () => {
    //     const {container} = renderWithIntl(getComponent());
    //     console.log(container.innerHTML);
    //     const deleteButton = container.querySelector('div[role="button"][aria-label="Delete"]');
    //     fireEvent.click(deleteButton);
    //     expect(onDeleteButtonClick).toHaveBeenCalled();
    // });

    test('it has a context menu with delete menu item and callback', () => {
        const {container} = renderWithIntl(getComponent());
        console.log(container.innerHTML);
        const image = container.querySelector('.ponies img');
        fireEvent.contextMenu(image);

        console.log(container.innerHTML);
        // const contextMenu = wrapper.find('ContextMenu');
        // expect(contextMenu.exists()).toBe(true);

        // const deleteMenuItem = contextMenu.find('.react-contextmenu-item').findWhere(node => node.text().includes('delete')).at(0);
        // deleteMenuItem.simulate('click');
        // expect(onDeleteButtonClick).toHaveBeenCalled();
    });
});
