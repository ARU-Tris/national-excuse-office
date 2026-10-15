import { Font } from "@react-pdf/renderer";
let registered = false;
export function registerDocumentFonts(base: string) {
  if (registered) return;
  Font.register({
    family: "AgencySans",
    fonts: [
      { src: `${base}NotoSansKR-Regular.ttf`, fontWeight: 400 },
      { src: `${base}NotoSansKR-Bold.ttf`, fontWeight: 700 },
    ],
  });
  Font.register({
    family: "AgencySerif",
    src: `${base}NotoSerifKR-Regular.ttf`,
  });
  Font.registerHyphenationCallback((word) =>
    /[\u3000-\u9fff\uac00-\ud7a3]/u.test(word) ? Array.from(word) : [word],
  );
  registered = true;
}
