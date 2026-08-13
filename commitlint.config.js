module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [2, 'always', ['auth', 'pokedex', 'teams', 'core', 'common', 'cache', 'state']],
    'scope-empty': [2, 'never'],
  },
};
