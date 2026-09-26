// Use Docusaurus's public PostCSS hook; do not replace its webpack configuration.
module.exports = function tailwindPlugin() {
  return {
    name: 'site-tailwind',
    configurePostCss(options) {
      options.plugins.push(require('@tailwindcss/postcss')());
      return options;
    },
  };
};
