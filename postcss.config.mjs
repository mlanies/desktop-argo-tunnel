import tailwindcss from "@tailwindcss/postcss";
import postcssPresetEnv from "postcss-preset-env";

export default {
  plugins: [
    tailwindcss(),
    postcssPresetEnv({
      /* pluginOptions */
      features: {},
    }),
  ],
};
