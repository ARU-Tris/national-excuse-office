import fs from "node:fs";
import path from "node:path";
import * as fontkit from "fontkit";

const root = process.cwd();
const font = fontkit.openSync(
  path.join(root, "public/fonts/NanumGothic-Bold.ttf"),
);
const emblemPaths = [
  "M12 10H44V22H24V78H44V90H12Z",
  "M56 10H88V90H56V78H76V22H56Z",
  "M34 32H66V43H34Z",
  "M34 51H49V62H34Z",
  "M57 51H66V62H57Z",
];
const conceptB = [
  "M10 10H47V22H22V47H10Z",
  "M53 10H90V47H78V22H53Z",
  "M10 53H22V78H47V90H10Z",
  "M78 53H90V90H53V78H78Z",
  "M34 34H66V66H34V56H56V44H34Z",
];
const conceptC = [
  "M12 10H88V90H12V10ZM24 22V78H76V22Z",
  "M34 32H66V43H45V56H66V68H34Z",
];
function textPaths(text, x, baseline, size) {
  const run = font.layout(text);
  let cursor = x;
  return run.glyphs.map((glyph, index) => {
    const scale = size / font.unitsPerEm;
    const transform = `translate(${cursor.toFixed(3)} ${baseline}) scale(${scale.toFixed(5)} ${(-scale).toFixed(5)})`;
    cursor += run.positions[index].xAdvance * scale;
    return { d: glyph.path.toSVG(), transform };
  });
}
const sealGlyphs = Array.from("국립핑계관리청장인").map((character, index) => {
  const glyph = font.glyphForCodePoint(character.codePointAt(0));
  const box = glyph.bbox;
  const x = 8 + (index % 3) * 29;
  const y = 8 + Math.floor(index / 3) * 29;
  const sx = 25 / (box.maxX - box.minX);
  const sy = 25 / (box.maxY - box.minY);
  return {
    d: glyph.path.toSVG(),
    transform: `translate(${(x - box.minX * sx).toFixed(4)} ${(y + 25 + box.minY * sy).toFixed(4)}) scale(${sx.toFixed(6)} ${(-sy).toFixed(6)})`,
  };
});
const sealBorder = "M2 3L97 2L98 97L3 98Z M6 7L7 94L94 93L93 7Z";
// Fixed incisions make a repeatable impression, never a random document identifier.
const sealCuts = [
  "M17 1H19V6H17Z",
  "M94 26H99V28H94Z",
  "M2 72H7V73H2Z",
  "M46 94H48V99H46Z",
  "M12 20H17V20.7H12Z",
  "M57 13H58V17H57Z",
  "M40 67H45V67.8H40Z",
  "M77 82H82V82.6H77Z",
  "M27 46H28V49H27Z",
  "M67 34H71V34.7H67Z",
  "M15 87H18V87.8H15Z",
  "M83 57H87V57.6H83Z",
];
const data = {
  version: "brand/1.0",
  emblemPaths,
  conceptB,
  conceptC,
  sealBorder,
  sealGlyphs,
  sealCuts,
};
fs.mkdirSync(path.join(root, "src/brand"), { recursive: true });
fs.writeFileSync(
  path.join(root, "src/brand/artwork.json"),
  JSON.stringify(data, null, 2),
);
const shapes = (paths, color = "#193A59") =>
  `<g fill="${color}">${paths.map((d) => `<path d="${d}"/>`).join("")}</g>`;
const svg = (width, height, content) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img">${content}</svg>`;
const write = (name, content) =>
  fs.writeFileSync(path.join(root, "public/brand", name), content);
for (const [name, color] of [
  ["emblem", "#193A59"],
  ["emblem-mono", "#18232D"],
  ["emblem-reverse", "#FFFFFF"],
  ["emblem-watermark", "#193A59"],
  ["favicon", "#193A59"],
])
  write(`${name}.svg`, svg(100, 100, shapes(emblemPaths, color)));
write("concept-b.svg", svg(100, 100, shapes(conceptB)));
write("concept-c.svg", svg(100, 100, shapes(conceptC)));
const outline = (paths) =>
  paths
    .map((item) => `<path d="${item.d}" transform="${item.transform}"/>`)
    .join("");
write(
  "logo-primary.svg",
  svg(
    456,
    100,
    `${shapes(emblemPaths)}<g fill="#193A59">${outline(textPaths("국립핑계관리청", 114, 65, 38))}</g>`,
  ),
);
write(
  "logo-stacked.svg",
  svg(
    300,
    184,
    `<g transform="translate(100 0)">${shapes(emblemPaths)}</g><g fill="#193A59">${outline(textPaths("국립핑계관리청", 25, 155, 31))}</g>`,
  ),
);
write(
  "seal-square-red.svg",
  svg(
    100,
    100,
    `<g fill="#AE333A"><path d="${sealBorder}" fill-rule="evenodd"/>${outline(sealGlyphs)}</g><g fill="white">${sealCuts.map((d) => `<path d="${d}"/>`).join("")}</g>`,
  ),
);
console.log(
  "Created nine brand variants, two alternative concepts, and the outlined 3 x 3 seal.",
);
