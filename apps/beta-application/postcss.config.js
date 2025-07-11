const { createPostcssConfig } = require('@ioc-core/config/postcss');

module.exports = createPostcssConfig({
  // Use modern Tailwind CSS v4 plugin
  legacy: false,
});