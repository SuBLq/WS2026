"""Create display-sized WebP variants, preserving original public image URLs.

Requires Pillow. Normal site builds do not need it: dimensions/mappings are saved.
"""
from pathlib import Path
from PIL import Image, ImageOps
import json

ROOT=Path(__file__).resolve().parents[1]
mapping={};original_bytes=display_bytes=0
for path in sorted((ROOT/'assets/guides').rglob('*')):
    if path.suffix.lower() not in {'.png','.webp','.jpg','.jpeg'} or path.stem.endswith(('-display','-mobile')):continue
    with Image.open(path) as source:
        image=ImageOps.exif_transpose(source).convert('RGB');display=path
        if path.suffix=='.png' and path.stat().st_size>100000:
            display=path.with_name(path.stem+'-display.webp');image.thumbnail((1440,2000),Image.Resampling.LANCZOS);image.save(display,'WEBP',quality=88,method=6)
            original_bytes+=path.stat().st_size;display_bytes+=display.stat().st_size
        info={'display':display.relative_to(ROOT).as_posix()}
        if image.width>900:
            small=image.copy();small.thumbnail((720,1400),Image.Resampling.LANCZOS)
            mobile=path.with_name(path.stem+'-mobile.webp');small.save(mobile,'WEBP',quality=87,method=6)
            info['mobile']=mobile.relative_to(ROOT).as_posix()
        mapping[path.relative_to(ROOT).as_posix()]=info
sizes={}
for path in (ROOT/'assets').rglob('*'):
    if path.suffix.lower() in {'.png','.webp','.jpg','.jpeg'}:
        with Image.open(path) as image:sizes[path.relative_to(ROOT).as_posix()]=list(image.size)
(ROOT/'content/image-variants.json').write_text(json.dumps(mapping,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(ROOT/'content/image-sizes.json').write_text(json.dumps(sizes,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(f'Large PNG display variants: {original_bytes/1e6:.2f} MB -> {display_bytes/1e6:.2f} MB. Originals retained.')
