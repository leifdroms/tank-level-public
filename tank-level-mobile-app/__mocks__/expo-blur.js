const React = require('react');

module.exports = {
  BlurView: ({ children, ...rest }) => React.createElement('BlurView', rest, children ?? null),
};
