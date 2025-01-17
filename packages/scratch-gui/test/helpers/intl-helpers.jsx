/*
 * Helpers for using enzyme and react-test-renderer with react-intl
 * Directly from https://github.com/yahoo/react-intl/wiki/Testing-with-React-Intl
 */
import React from 'react';
import renderer from 'react-test-renderer';
import {IntlProvider, createIntl} from 'react-intl';
import intlShape from '../../src/lib/intlShape';
import {mount, shallow} from 'enzyme';

const intl = createIntl({locale: 'en', messages: {}});

const shallowWithIntl = (node, {context} = {}) => shallow(
    node,
    {
        context: Object.assign({}, context, {intl}),
        wrappingComponent: IntlProvider,
        wrappingComponentProps: {
            locale: 'en',
            messages: {}
        }
    }
).dive();

const mountWithIntl = (node, {context, childContextTypes} = {}) => mount(
    node,
    {
        context: Object.assign({}, context, {intl}),
        childContextTypes: Object.assign({}, {intl: intlShape}, childContextTypes),
        wrappingComponent: IntlProvider,
        wrappingComponentProps: {
            locale: 'en',
            messages: {}
        }
    }
);

// react-test-renderer component for use with snapshot testing
const componentWithIntl = (children, props = {locale: 'en'}) => renderer.create(
    <IntlProvider 
        textComponent='span'
        {...props}
    >
        {children}
    </IntlProvider>
);

export {
    componentWithIntl,
    shallowWithIntl,
    mountWithIntl
};
