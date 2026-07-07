import os
import glob
from PIL import Image, ImageChops

def make_white_transparent(img, tolerance=20):
    img = img.convert("RGBA")
    data = img.getdata()
    new_data = []
    for item in data:
        # if r, g, b are all high enough, it's near white
        if item[0] >= 255 - tolerance and item[1] >= 255 - tolerance and item[2] >= 255 - tolerance:
            new_data.append((255, 255, 255, 0))
        else:
            new_data.append(item)
    img.putdata(new_data)
    return img

def autocrop_image(image):
    bg = Image.new(image.mode, image.size, image.getpixel((0,0)))
    diff = ImageChops.difference(image, bg)
    diff = ImageChops.add(diff, diff, 2.0, -100)
    bbox = diff.getbbox()
    if bbox:
        return image.crop(bbox)
    return image

in_dir = r"d:\thuc_pham_so_mot\TPS1_logos_hang_1_2\TPS1_logos_hang_1_2"
out_dir = r"d:\thuc_pham_so_mot\public\images\partners\logos"

os.makedirs(out_dir, exist_ok=True)

# clear old logos
for f in glob.glob(os.path.join(out_dir, "*.png")):
    try: os.remove(f)
    except: pass

files = glob.glob(os.path.join(in_dir, "*.png"))
for f in files:
    if len(os.path.basename(f)) > 30: continue
    
    img = Image.open(f).convert("RGB")
    cropped = autocrop_image(img)
    
    # Make white transparent
    trans = make_white_transparent(cropped, tolerance=30)
    
    # Add a uniform transparent padding
    w, h = trans.size
    pad = 10
    final = Image.new("RGBA", (w + pad*2, h + pad*2), (0, 0, 0, 0))
    final.paste(trans, (pad, pad))
    
    # Scale all logos to a fixed height to make them look uniform in the ribbon
    target_h = 100
    ratio = target_h / float(final.size[1])
    target_w = int(float(final.size[0]) * ratio)
    final = final.resize((target_w, target_h), Image.Resampling.LANCZOS)
    
    out_name = os.path.basename(f).replace(" ", "_")
    final.save(os.path.join(out_dir, out_name), "PNG")
    print(f"Processed {out_name}")
