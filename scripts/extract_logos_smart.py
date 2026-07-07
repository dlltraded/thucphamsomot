from PIL import Image
import os
import glob

def extract_logos_from_grid(img_path, rows, cols, out_prefix, threshold=235, padding=8):
    print(f"Processing {img_path}")
    img_orig = Image.open(img_path).convert("RGBA")
    # Crop outer 15 pixels to completely eliminate the green container border
    width_orig, height_orig = img_orig.size
    img = img_orig.crop((15, 15, width_orig - 15, height_orig - 15))
    
    gray = img.convert("L")
    width, height = img.size
    
    # Explicit row bounds (y1, y2) adjusted for 15px crop
    row_bounds = [
        (140, 255),
        (260, 370),
        (375, 490)
    ]
    
    cell_w = width / cols
    
    out_dir = "public/images/partners/logos"
    os.makedirs(out_dir, exist_ok=True)
    
    count = 0
    for r in range(rows):
        for c in range(cols):
            # Define cell boundaries
            cx1 = int(c * cell_w)
            cx2 = int((c + 1) * cell_w)
            cy1, cy2 = row_bounds[r]
            
            # Find bounding box of dark pixels within this cell
            min_x, min_y = cx2, cy2
            max_x, max_y = cx1, cy1
            
            has_pixels = False
            for y in range(cy1, cy2):
                for x in range(cx1, cx2):
                    if gray.getpixel((x, y)) < threshold:
                        if x < min_x: min_x = x
                        if x > max_x: max_x = x
                        if y < min_y: min_y = y
                        if y > max_y: max_y = y
                        has_pixels = True
            
            if has_pixels:
                # Add padding
                min_x = max(cx1, min_x - padding)
                min_y = max(cy1, min_y - padding)
                max_x = min(cx2, max_x + padding)
                max_y = min(cy2, max_y + padding)
                
                # Check valid bbox
                if max_x > min_x and max_y > min_y:
                    logo = img.crop((min_x, min_y, max_x, max_y))
                    
                    # Make background transparent. The handshake watermark is faint (e.g. RGB all > 230)
                    data = logo.getdata()
                    new_data = []
                    for item in data:
                        # (r, g, b, a)
                        # If pixel is very bright, it's background/watermark
                        if item[0] > 230 and item[1] > 230 and item[2] > 230:
                            new_data.append((255, 255, 255, 0)) # transparent
                        else:
                            new_data.append(item)
                    logo.putdata(new_data)
                    
                    logo.save(f"{out_dir}/{out_prefix}_r{r}_c{c}.png")
                    count += 1
                    
    print(f"Extracted {count} logos from {img_path}")

img1_path = r"C:\Users\boanl\.gemini\antigravity-ide\brain\f6b6afa4-70f2-435b-8eaa-b27a4a2e0a20\media__1783228087886.png"
img2_path = r"C:\Users\boanl\.gemini\antigravity-ide\brain\f6b6afa4-70f2-435b-8eaa-b27a4a2e0a20\media__1783228087900.png"

old_logos = glob.glob("public/images/partners/logos/*.png")
for f in old_logos:
    try:
        os.remove(f)
    except:
        pass

# Image 1 is 3 rows, 5 cols
extract_logos_from_grid(img1_path, 3, 5, "set1")
# Image 2 is 3 rows, 6 cols
extract_logos_from_grid(img2_path, 3, 6, "set2")
