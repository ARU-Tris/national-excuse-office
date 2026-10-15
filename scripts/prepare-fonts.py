"""Instantiate the full, OFL-licensed KR variable fonts for PDF 1.x embedding.

Download the upstream files listed in docs/document-spec.md into tmp/fonts first.
Requires fonttools. This runs at development time, never in visitors' browsers.
"""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

for family, weight in [('NotoSansKR',400),('NotoSansKR',700),('NotoSerifKR',400)]:
    output=Path('public/fonts') / f'{family}-{"Bold" if weight==700 else "Regular"}.ttf'
    font=TTFont(Path('tmp/fonts') / f'{family}-VF.ttf')
    font=instantiateVariableFont(font,{'wght':weight},inplace=True)
    font.save(output)
    print(f'{output}: {output.stat().st_size:,} bytes',flush=True)
