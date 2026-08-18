import {eslintConfigScratch} from 'eslint-config-scratch';
import {globalIgnores} from 'eslint/config';
import globals from 'globals';
import importPlugin from 'eslint-plugin-import-x';

export default eslintConfigScratch.defineConfig(
    eslintConfigScratch.legacy.base,
    importPlugin.flatConfigs.errors,
    {
        files: ['*.{js,cjs,mjs,ts}', 'scripts/**/*.{js,cjs,mjs,ts}'],
        extends: [eslintConfigScratch.legacy.node],
        languageOptions: {
            globals: globals.node
        },
        rules: {
            'no-console': 'off'
        }
    },
    {
        files: ['{src,test}/**/*.{js,cjs,mjs,jsx,ts,tsx}'],
        extends: [
            eslintConfigScratch.legacy.es6,
            eslintConfigScratch.legacy.react,
            eslintConfigScratch.legacy.typescript
        ],
        languageOptions: {
            globals: {
                ...globals.browser,
                process: 'readonly'
            },
            parserOptions: {
                projectService: false,
                tsconfigRootDir: import.meta.dirname,
                project: [
                    'tsconfig.eslint.json',
                    'tsconfig.test.json'
                ]
            }
        },
        settings: {
            'react': {
                version: 'detect'
            },
            'import-x/resolver': {
                typescript: {
                    project: 'tsconfig.eslint.json'
                }
            }
        },
        rules: {
            // webpack inline loader syntax (e.g. `!raw-loader!./file.svg`) is not resolvable by the
            // TypeScript resolver; these are valid at runtime via webpack's loader pipeline
            'import-x/no-unresolved': ['error', {ignore: ['^!']}],

            // BEGIN: these caused trouble after upgrading eslint-plugin-react from 7.24.0 to 7.33.2
            'react/forbid-prop-types': 'warn',
            'react/no-unknown-property': 'warn',
            // END: these caused trouble after upgrading eslint-plugin-react from 7.24.0 to 7.33.2

            // we should probably just fix these...
            'arrow-parens': 'warn',
            'react/no-deprecated': 'warn',
            'require-atomic-updates': 'warn',
            '@typescript-eslint/no-unused-vars': ['warn', {
                args: 'after-used',
                caughtErrors: 'none', // TODO: use caughtErrorsPattern instead
                varsIgnorePattern: '^_'
            }],
            '@typescript-eslint/no-use-before-define': 'warn',
            '@typescript-eslint/prefer-promise-reject-errors': 'warn'
        }
    },
    // Keep the legacy Scratch GUI style checks visible as warnings. The
    // repository intentionally predates the current flat-config rule levels;
    // these formatting rules should not block Node 22 builds or tests.
    {
        files: ['{src,test}/**/*.{js,cjs,mjs,jsx,ts,tsx}', 'server-runtime.js'],
        rules: {
            'no-alert': 'warn',
            'no-console': 'warn',
            'no-else-return': 'warn',
            'no-eq-null': 'warn',
            'no-lonely-if': 'warn',
            'no-negated-condition': 'warn',
            'no-new': 'warn',
            'no-undefined': 'warn',
            'no-unneeded-ternary': 'warn',
            'prefer-template': 'warn',
            'eqeqeq': 'warn',
            'func-style': 'warn',
            'arrow-body-style': 'warn',
            'no-unused-vars': 'warn',
            'react/jsx-max-props-per-line': 'warn',
            'react/jsx-no-bind': 'warn',
            'react/jsx-indent': 'warn',
            'react/jsx-tag-spacing': 'warn',
            'react/prop-types': 'warn',
            'react/self-closing-comp': 'warn',
            'react/sort-comp': 'warn',
            '@stylistic/arrow-parens': 'warn',
            '@stylistic/indent': 'warn',
            '@stylistic/max-len': 'warn',
            '@stylistic/newline-per-chained-call': 'warn',
            '@stylistic/no-multiple-empty-lines': 'warn',
            '@stylistic/no-trailing-spaces': 'warn',
            '@stylistic/object-curly-spacing': 'warn',
            '@stylistic/operator-linebreak': 'warn',
            '@stylistic/quote-props': 'warn',
            '@stylistic/semi': 'warn',
            '@stylistic/space-before-function-paren': 'warn'
        }
    },
    {
        files: ['{src,test}/**/*.{js,cjs,mjs,jsx,ts,tsx}'],
        rules: {
            '@typescript-eslint/require-await': 'warn'
        }
    },
    {
        files: ['test/**/*.{js,cjs,mjs,jsx,ts,tsx}'],
        languageOptions: {
            globals: {
                ...globals.jest,
                ...globals.node
            }
        },
        rules: {
            '@stylistic/max-len': [
                'warn',
                // settings copied from eslint-config-scratch.legacy.base
                {
                    code: 120,
                    tabWidth: 4,
                    ignoreUrls: true
                }
            ],
            'react/prop-types': 'off' // don't worry about prop types in tests
        }
    },
    {
        // disable some checks for these generated files
        files: ['{src,test}/**/types.d.ts'],
        rules: {
            '@stylistic/indent': 'off'
        }
    },
    {
        files: [
            'src/lib/libraries/extensions/index.jsx',
            'src/lib/libraries/decks/*.js'
        ],
        rules: {
            // the way these files are built makes duplicate imports the natural way to do things
            'no-duplicate-imports': 'off'
        }
    },
    globalIgnores([
        'build/**/*',
        'dist/**/*',
        'node_modules/**/*'
    ])
);
