// Fonts are bundled from npm (@fontsource/*) so renders never depend on a network font CDN.
// To change families: npm i @fontsource/<family>, import its CSS here, and set the family name in DESIGN.md.
// Commercial fonts: drop the .woff2 into public/fonts/ and declare an @font-face in public/fonts/fonts.css,
// then import it below with staticFile — see the remotion-engine skill, "Custom fonts".
import '@fontsource/michroma/400.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/700.css';

export const FONT_FAMILIES = ['Michroma', 'Inter', 'JetBrains Mono'];
