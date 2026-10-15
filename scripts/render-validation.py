import subprocess
from pathlib import Path
from PIL import Image, ImageOps, ImageDraw

destination=Path('tmp/pdfs/final')
destination.mkdir(parents=True,exist_ok=True)
for previous in destination.glob('*.png'):
    previous.unlink()
for source in sorted(Path('output/pdf/validation').glob('*.pdf')):
    subprocess.run(['pdftoppm','-scale-to','1100','-png',str(source),str(destination/source.stem)],check=True)
files=sorted(destination.glob('*.png'))
width,height=380,570
sheet=Image.new('RGB',(width*3,height*((len(files)+2)//3)), '#e7edf1')
draw=ImageDraw.Draw(sheet)
for index,source in enumerate(files):
    image=Image.open(source).convert('RGB')
    image.thumbnail((width-24,height-35))
    x=index%3*width+(width-image.width)//2
    y=index//3*height+27
    sheet.paste(image,(x,y))
    draw.text((index%3*width+14,index//3*height+8),source.stem,fill='#193a59')
sheet.save('tmp/pdfs/final-contact-sheet.png')
print(f'Rendered {len(files)} pages and generated the inspection sheet.')
