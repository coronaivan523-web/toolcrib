from PIL import Image

def make_transparent(input_path, output_path):
    print(f"Processing {input_path}...")
    img = Image.open(input_path).convert("RGBA")
    width, height = img.size
    
    # 1. Analyze for Cropping
    # We want to find the last row of the "main logo" and crop anything below it (the search bar).
    # Heuristic: Scan rows. Find the first block of non-background pixels. 
    # Stop when we hit a large gap of background pixels.
    
    bg_color = img.getpixel((0, 0)) # Assumes top-left is background
    bg_r, bg_g, bg_b, _ = bg_color
    print(f"Detected Background for analysis: {bg_color}")
    
    last_content_row = 0
    in_content_block = False
    gap_size = 0
    MAX_GAP = 20 # If we see 20 empty rows, we assume the logo has ended.
    
    for y in range(height):
        row_has_content = False
        for x in range(width):
            r, g, b, a = img.getpixel((x, y))
            # simple distance
            dist = abs(r - bg_r) + abs(g - bg_g) + abs(b - bg_b)
            if dist > 30: # It's not background
                row_has_content = True
                break
        
        if row_has_content:
            if not in_content_block:
                in_content_block = True # Started seeing the logo
            gap_size = 0 # Reset gap counter
            last_content_row = y
        else:
            if in_content_block:
                gap_size += 1
                if gap_size > MAX_GAP:
                    # We found a big gap after the logo. 
                    # Assuming everything after this `last_content_row` is garbage/search bar.
                    break
    
    print(f"Determined cut-off row: {last_content_row}. Original height: {height}")
    
    # Crop if we found a cut-off significantly smaller than height
    if last_content_row > 0 and last_content_row < height - 10:
        print("Cropping image...")
        # Add a small padding
        crop_bottom = min(height, last_content_row + 5)
        img = img.crop((0, 0, width, crop_bottom))
        
    # 2. Apply Transparency (The logic we just fixed)
    datas = img.getdata()
    newData = []
    
    # Refresh BG color in case crop changed top-left (unlikely but safe)
    # Actually top-left (0,0) is preserved.
    
    for item in datas:
        r, g, b, a = item
        # Calculate brightness (luminance)
        brightness = (r + g + b) / 3
        
        # Hard Threshold for Sharpness
        if brightness > 150: 
            # It's part of the text/logo -> Make PURE WHITE
            newData.append((255, 255, 255, 255))
        else:
            # It's background -> Make TRANSPARENT
            newData.append((30, 58, 138, 0))

    img.putdata(newData)
    img.save(output_path, "PNG")
    print(f"Saved to {output_path}")

# Run the function
if __name__ == "__main__":
    make_transparent(
        r"c:\Users\Ivan.Corona\.gemini\antigravity\scratch\toolcrib\frontend\public\wasion_logo_large.png",
        r"c:\Users\Ivan.Corona\.gemini\antigravity\scratch\toolcrib\frontend\public\wasion_logo_large.png"
    )
