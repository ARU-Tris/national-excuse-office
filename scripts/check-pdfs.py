"""Check actual PDF structure, searchable Korean, page boxes, and rendered bounds."""
import json
from pathlib import Path
from pypdf import PdfReader
import pdfplumber

results = []
for filename in sorted(Path('output/pdf/validation').glob('*.pdf')):
    reader = PdfReader(filename)
    text = '\n'.join(page.extract_text() for page in reader.pages)
    assert '가상기관 창작문서' in text, filename
    assert 'PM-20261015-' in text, filename
    assert len(text) > 200, filename
    font_count = 0
    bad_bounds = []
    with pdfplumber.open(filename) as pdf:
        for number, page in enumerate(pdf.pages, 1):
            assert abs(page.width - 595.28) < 1 and abs(page.height - 841.89) < 1, filename
            for char in page.chars:
                if char['text'].strip() and (char['x0'] < 35 or char['x1'] > page.width - 35 or char['top'] < 25 or char['bottom'] > page.height - 20):
                    bad_bounds.append((number, char['text'], round(char['top']), round(char['x0'])))
            assert any('가상기관' in line for line in (page.extract_text() or '').splitlines()), (filename, number, 'missing footer')
    assert not bad_bounds, (filename, bad_bounds[:20])
    for page in reader.pages:
        for font_ref in page['/Resources'].get('/Font', {}).values():
            font = font_ref.get_object()
            if '/DescendantFonts' in font:
                desc = font['/DescendantFonts'][0].get_object().get('/FontDescriptor')
                if desc and ('/FontFile2' in desc.get_object() or '/FontFile3' in desc.get_object()):
                    font_count += 1
    assert font_count, (filename, 'no embedded fonts')
    if filename.stem == 'F-06-long':
        assert len(reader.pages) >= 2, filename
        for word in ['漢字', '韓國', 'English', '123']:
            assert word in text, (filename, word)
    results.append({'file':filename.name, 'pages':len(reader.pages), 'characters':len(text), 'embedded_fonts':font_count, 'bounds':'pass'})
Path('output/pdf/validation/results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(results,ensure_ascii=True,indent=2))
