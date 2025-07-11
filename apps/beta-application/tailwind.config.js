/** @type {import('tailwindcss').Config} */
const { createTailwindConfig } = require('@ioc-core/config/tailwind');

module.exports = createTailwindConfig({
  // The IOC brand colors are already included in the shared config
  // Add any staging-specific customizations here
});