// https://eslint.org/docs/user-guide/configuring

module.exports = {
  root: true,
  parser: 'babel-eslint',
  parserOptions: {
    ecmaVersion: 2017,
    sourceType: 'module'
  },
  env: {
    browser: true,
    es6: true
  },
  extends: [
    'eslint:recommended'
  ],
  // add your custom rules here
  rules: {
    'no-unused-vars': 1,
  }
}
