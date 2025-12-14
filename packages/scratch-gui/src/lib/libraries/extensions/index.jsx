import React from 'react';
import {FormattedMessage} from 'react-intl';

import albilabIconURL from './albilab/albilab.png';
import albilabInsetIconURL from './albilab/albilab-small.svg';
import albilabBackgroundURL from './albilab/obsah-baleni.jpg';

export default [
    {
        name: (
            <FormattedMessage
                defaultMessage="AlbiLAB"
                description="Name for the 'AlbiLAB' extension"
                id="gui.extension.albilab.name"
            />
        ),
        extensionId: 'albilab',
        iconURL: albilabIconURL,
        insetIconURL: albilabInsetIconURL,
        backgroundImageURL: albilabBackgroundURL,
        description: (
            <FormattedMessage
                defaultMessage="Extension for AlbiLAB."
                description="Description for the 'AlbiLAB' extension"
                id="gui.extension.albilab.description"
            />
        ),
        featured: true
    }
];
