from PIL import Image
import os
import glob

def extract_grid(img_path, rows, cols, row_bounds, out_prefix):
    print(f"Processing {img_path}")
    img = Image.open(img_path).convert("RGB")
    width, height = img.size
    
    cell_w = width / cols
    
    out_dir = "public/images/partners/logos"
    os.makedirs(out_dir, exist_ok=True)
    
    # We will do a blind crop, but we shrink the box by 'inset' pixels to avoid bleeding
    inset_x = 20
    inset_y = 15
    
    count = 0
    for r in range(rows):
        for c in range(cols):
            x1 = int(c * cell_w) + inset_x
            x2 = int((c + 1) * cell_w) - inset_x
            
            y1, y2 = row_bounds[r]
            y1 += inset_y
            y2 -= inset_y
            
            logo = img.crop((x1, y1, x2, y2))
            logo.save(f"{out_dir}/{out_prefix}_r{r}_c{c}.png")
            count += 1
            
    print(f"Extracted {count} logos from {img_path}")

img1_path = r"C:\Users\boanl\.gemini\antigravity-ide\brain\f6b6afa4-70f2-435b-8eaa-b27a4a2e0a20\media__1783228087886.png"
img2_path = r"C:\Users\boanl\.gemini\antigravity-ide\brain\f6b6afa4-70f2-435b-8eaa-b27a4a2e0a20\media__1783228087900.png"

old_logos = glob.glob("public/images/partners/logos/*")
for f in old_logos:
    try:
        os.remove(f)
    except:
        pass

# Image 1 is 1024x576. 3 rows.
# From earlier, rows are around: 140-270, 275-390, 390-505
row_bounds_1 = [
    (140, 270),
    (270, 390),
    (390, 510)
]
extract_grid(img1_path, 3, 5, row_bounds_1, "set1")

# Image 2 is 1024x576. 3 rows.
row_bounds_2 = [
    (140, 270),
    (270, 390),
    (390, 510)
]
extract_grid(img2_path, 3, 6, row_bounds_2, "set2")
