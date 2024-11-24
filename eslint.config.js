import antfu from '@antfu/eslint-config';

export default antfu(

  /* options for antu config - https://github.com/antfu/eslint-config */
  {},

  /* override antfu config */
  {
    rules: {
      /* use semicolons at the end of the line */
      'style/semi': ['error', 'always'], // https://eslint.style/rules/js/semi

      /* use single quotes for strings */
      'style/quotes': ['error', 'single', { avoidEscape: true, allowTemplateLiterals: true }], // https://eslint.style/rules/js/quotes

      /* always wrap the arguments of an arrow function in parenthesis */
      'style/arrow-parens': ['error', 'always'], // https://eslint.style/rules/js/arrow-parens

      /* put operators at the end of the former line if there is a line break (especially the `=`) */
      'style/operator-linebreak': ['error', 'after', { overrides: { '?': 'before', ':': 'before' } }], // https://eslint.style/rules/js/operator-linebreak

      /* allow fully customized use of curly braces and line breaks after 'if', 'else', 'which', 'for', ... */
      'curly': ['off'], // https://eslint.org/docs/latest/rules/curly
      'antfu/if-newline': 'off', // https://github.com/antfu/eslint-plugin-antfu/blob/main/src/rules/if-newline.md

      /* use commas to delimit properties in typescript object type and interface declarations */
      'style/member-delimiter-style': ['error', { // https://eslint.style/rules/ts/member-delimiter-style
        multiline: {
          delimiter: 'comma',
          requireLast: true,
        },
        singleline: {
          delimiter: 'comma',
          requireLast: false,
        },
      }],

      /* allow assignments in condition statements */
      'no-cond-assign': 'off', // https://eslint.org/docs/latest/rules/no-cond-assign
    },
  },
);
