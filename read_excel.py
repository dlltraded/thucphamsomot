import zipfile, xml.etree.ElementTree as ET

z = zipfile.ZipFile('Thực Phẩm Số 1.xlsx')

# Read shared strings
ss_xml = z.read('xl/sharedStrings.xml')
ss_tree = ET.fromstring(ss_xml)
ns = {'ns': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
strings = []
for si in ss_tree.findall('ns:si', ns):
    t_texts = si.findall('.//ns:t', ns)
    strings.append(''.join(t.text or '' for t in t_texts))

# Read sheet1
sh_xml = z.read('xl/worksheets/sheet1.xml')
sh_tree = ET.fromstring(sh_xml)
rows = sh_tree.findall('.//ns:row', ns)

def cell_val(c):
    t = c.get('t', '')
    v_el = c.find('ns:v', ns)
    if v_el is None: return ''
    v = v_el.text or ''
    if t == 's':
        idx = int(v)
        return strings[idx] if idx < len(strings) else v
    return v

print('=== HEADER ROW (Row 1) ===')
if rows:
    for c in rows[0].findall('ns:c', ns):
        ref = c.get('r', '')
        val = cell_val(c)
        print(f'  {ref}: [{val}]')

print(f'\nTotal rows: {len(rows)}')

# Sample data rows 2-5
for i in range(1, min(4, len(rows))):
    print(f'\n--- Row {i+1} ---')
    for c in rows[i].findall('ns:c', ns):
        ref = c.get('r', '')
        val = cell_val(c)
        if val:
            print(f'  {ref}: {val}')
