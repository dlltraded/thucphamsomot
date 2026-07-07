"""
Crop individual partner logos from the TPS1 composite sheets.
File 1 (1500x560): Layout ~5+5+4 logos
File 2 (1500x560): Layout ~5+5+5 logos
"""
from PIL import Image
import os, sys

PYEXE  = r"C:\Users\boanl\AppData\Local\Python\bin\python.exe"
OUT    = r"public/images/partners/logos"
os.makedirs(OUT, exist_ok=True)

def crop_logo(img, x1, y1, x2, y2, name):
    """Crop a region and save as PNG with white background."""
    cell = img.crop((x1, y1, x2, y2))
    # Ensure white background
    bg = Image.new("RGB", cell.size, (255, 255, 255))
    if cell.mode == "RGBA":
        bg.paste(cell, mask=cell.split()[3])
    else:
        bg.paste(cell.convert("RGB"))
    out_path = os.path.join(OUT, f"{name}.png")
    bg.save(out_path, "PNG", optimize=True)
    return out_path

# ===========================================================
# FILE 1: tps1-partner-logos-1.png (1500x560)
# Layout detected visually:
#   Row 1 (y≈30 to 185) : 5 logos  - Hoa Phat, Alphafood, Golf Course, Hiep Phat, BlueScope
#   Row 2 (y≈185 to 340): 5 logos  - Hiepphatfood, Nha May X51, PetroVietnam, IDC, Soltec
#   Row 3 (y≈340 to 490): 4 logos  - AGI, Rainbow, Ngoc Lan, Ngoc Lan 2
# ===========================================================
img1 = Image.open("public/images/partners/tps1-partner-logos-1.png")
W1, H1 = img1.size  # 1500 x 560

# Row/column boundaries for file 1 (5-5-4 layout)
# The green footer starts at y≈490
row1_bands = [
    (20,  190),   # row 1
    (188, 360),   # row 2
    (355, 520),   # row 3
]

# File 1, Row 1: 5 equal columns across full width
row1_logos = [
    "hoa-phat-container",
    "alphafood",
    "golf-course-sonadezi",
    "hiep-phat-phu-my",
    "bluescope",
]

# File 1, Row 2: 5 logos but center area (x ~220 to ~1500)
row2_logos = [
    "hiepphatfood-catering",
    "nha-may-x51",
    "petrovietnam-pvd-training",
    "idc-fluid-control",
    "soltec",
]

# File 1, Row 3: 4 logos, centered
row3_logos = [
    "agi-kindergarten",
    "rainbow-preschool",
    "mam-non-hoa-ngoc-lan",
    "mam-non-ngoc-lan-2",
]

saved = []

# Row 1 - 5 equal cols
y1s, y1e = row1_bands[0]
col_w1 = W1 // 5
for i, name in enumerate(row1_logos):
    x1 = i * col_w1 + 8
    x2 = (i+1) * col_w1 - 8
    p = crop_logo(img1, x1, y1s, x2, y1e, name)
    print(f"  OK {name}")
    saved.append(p)

# Row 2 - 5 equal cols (first col spans ~0-300, starts with logo at 0)
y2s, y2e = row1_bands[1]
for i, name in enumerate(row2_logos):
    x1 = i * col_w1 + 8
    x2 = (i+1) * col_w1 - 8
    p = crop_logo(img1, x1, y2s, x2, y2e, name)
    print(f"  OK {name}")
    saved.append(p)

# Row 3 - 4 logos, need to figure out positions
# They appear centered: roughly 4 groups across 1500px
# Groups: 0-350, 350-700, 700-1100, 1100-1500
y3s, y3e = row1_bands[2]
row3_cols = [(30, 345), (360, 670), (700, 1100), (1110, 1480)]
for (x1, x2), name in zip(row3_cols, row3_logos):
    p = crop_logo(img1, x1, y3s, x2, y3e, name)
    print(f"  OK {name}")
    saved.append(p)

print(f"\nFile 1: {len(saved)} logos saved")
print("---")

# ===========================================================
# FILE 2: tps1-partner-logos-2.png (1500x560)
# Layout: 5+5+5 = 15 logos
# Row 1: Hung Nghiep Formosa, LSP, Fashion 2, Leader, Regza
# Row 2: Aqua, Saite, Thien Long, Dechang, Fullxin
# Row 3: Nhat Go, Giay Sai Gon, Starprint, Uy Viet, Caesar
# ===========================================================
img2 = Image.open("public/images/partners/tps1-partner-logos-2.png")
W2, H2 = img2.size

# File 2 rows: logos start after gradient header (~y=25) to before footer (~y=505)
file2_rows = [
    (20,  185),   # row 1
    (183, 345),   # row 2
    (340, 505),   # row 3
]

file2_logos = [
    # row 1
    ("hung-nghiep-formosa", 0, 0),
    ("lsp-long-son",        1, 0),
    ("fashion2-garments",   2, 0),
    ("leader",              3, 0),
    ("regza-vietnam",       4, 0),
    # row 2
    ("aqua",                0, 1),
    ("saite",               1, 1),
    ("thien-long",          2, 1),
    ("dechang",             3, 1),
    ("fullxin-vietnam",     4, 1),
    # row 3
    ("nhat-go",             0, 2),
    ("giay-sai-gon",        1, 2),
    ("starprint",           2, 2),
    ("uy-viet",             3, 2),
    ("caesar-vietnam",      4, 2),
]

saved2 = []
col_w2 = W2 // 5
for name, col, row in file2_logos:
    ys, ye = file2_rows[row]
    x1 = col * col_w2 + 10
    x2 = (col+1) * col_w2 - 10
    p = crop_logo(img2, x1, ys, x2, ye, name)
    print(f"  OK {name}")
    saved2.append(p)

print(f"\nFile 2: {len(saved2)} logos saved")

total = len(saved) + len(saved2)
print(f"\nTotal: {total} logos -> {OUT}/")
print("DONE")
