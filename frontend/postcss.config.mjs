import animations from './src/Styles/Variables/animations.js';
import dimensions from './src/Styles/Variables/dimensions.js';
import fonts from './src/Styles/Variables/fonts.js';
import zIndexes from './src/Styles/Variables/zIndexes.js';

const mixinsFiles = [
  'frontend/src/Styles/Mixins/cover.css',
  'frontend/src/Styles/Mixins/linkOverlay.css',
  'frontend/src/Styles/Mixins/scroller.css',
  'frontend/src/Styles/Mixins/truncate.css'
];

// The variable files are ES modules shared with the app code. Vite reads this
// config once, so restart `yarn start` after changing one of them.
export default {
  plugins: {
    'postcss-mixins': {
      mixinsFiles
    },
    'postcss-simple-vars': {
      variables: () => ({ ...dimensions, ...fonts, ...animations, ...zIndexes })
    },
    'postcss-nested': {}
  }
};
