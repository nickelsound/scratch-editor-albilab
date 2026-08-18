import {eslintConfigScratch} from 'eslint-config-scratch';
import {globalIgnores} from 'eslint/config';
import globals from 'globals';

export default eslintConfigScratch.defineConfig(
    eslintConfigScratch.legacy.base,
    {
        files: ['src/**/*.{,c,m}js'],
        extends: [eslintConfigScratch.legacy.es6],
        languageOptions: {
            globals: globals.browser
        },
        rules: {
            'no-unused-vars': 'warn'
        }
    },
    {
        files: ['src/extension-support/extension-worker.js'],
        languageOptions: {
            globals: globals.worker
        }
    },
    {
        files: [
            '*.{,c,m}js', // for example, webpack.config.js
            'test/**/*.{,c,m}js'
        ],
        extends: [eslintConfigScratch.legacy.node],
        languageOptions: {
            globals: globals.node
        },
        rules: {
            'no-undefined': 'warn'
        }
    },
    // The original AlbiLAB hardware client predates the current Scratch lint
    // style and intentionally contains its own logging/async wrappers. Keep
    // it covered by ESLint for syntax and globals, but do not make the whole
    // VM pipeline fail on unrelated legacy formatting rules.
    {
        files: ['src/extensions/scratch3_albilab/{,**/}*.js'],
        languageOptions: {
            globals: {
                process: 'readonly'
            }
        },
        rules: {
            'func-style': 'off',
            'no-console': 'off',
            'no-undefined': 'off',
            'no-undef': 'off',
            'require-await': 'off',
            '@stylistic/arrow-parens': 'off',
            '@stylistic/max-len': 'off',
            '@stylistic/newline-per-chained-call': 'off',
            '@stylistic/object-curly-spacing': 'off',
            '@stylistic/quote-props': 'off',
            '@stylistic/quotes': 'off',
            '@stylistic/space-before-function-paren': 'off'
        }
    },
    globalIgnores([
        'benchmark/**/*',
        'coverage/**/*',
        'dist/**/*',
        'node_modules/**/*',
        'playground/**/*',
        'tap-snapshots/**/*'
    ])
);
