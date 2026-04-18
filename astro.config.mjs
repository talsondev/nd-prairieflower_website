// @ts-check
import { defineConfig, fontProviders } from 'astro/config';

// https://astro.build/config
export default defineConfig({
    fonts: [{
        provider: fontProviders.google(),
        name: 'EB Garamond',
        cssVariable: '--font-garamond',
        weights: [400, 700],
        styles: ['normal']
    },
    {
        provider: fontProviders.google(),
        name: 'Figtree',
        cssVariable: '--font-figtree',
        weights: [400, 700],
        styles: ['normal', 'italic']
    }]
});
