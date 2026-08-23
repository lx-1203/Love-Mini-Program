import zipfile
from xml.etree import ElementTree as ET

path = "G:/桌面/项目立项书(1).docx"
W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
ns = {'w': W}

def para_text(p):
    return ''.join(t.text or '' for t in p.iter(f'{{{W}}}t'))

def style_of(p):
    ppr = p.find(f'{{{W}}}pPr')
    if ppr is None:
        return None
    ps = ppr.find(f'{{{W}}}pStyle')
    return ps.get(f'{{{W}}}val') if ps is not None else None

z = zipfile.ZipFile(path)
xml = z.read('word/document.xml')
root = ET.fromstring(xml)
body = root.find(f'{{{W}}}body')
out = []
for el in body:
    tag = el.tag.split('}')[1]
    if tag == 'p':
        st = style_of(el)
        txt = para_text(el)
        if not txt.strip() and not st:
            continue
        prefix = f'[{st}] ' if st else ''
        out.append(prefix + txt)
    elif tag == 'tbl':
        out.append('--- TABLE ---')
        for row in el.findall(f'{{{W}}}tr'):
            cells = []
            for c in row.findall(f'{{{W}}}tc'):
                celltext = ' '.join(para_text(p) for p in c.findall(f'{{{W}}}p'))
                cells.append(celltext)
            out.append(' | '.join(cells))
        out.append('--- /TABLE ---')
print('\n'.join(out))
