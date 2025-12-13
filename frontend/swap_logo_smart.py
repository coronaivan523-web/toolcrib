from PIL import Image

def smart_swap(input_path, output_path):
    print(f"Smart Swapping {input_path}...")
    img = Image.open(input_path).convert("RGBA")
    
    # Original Background: Deep Purple (~ RGB 44, 0, 142) -> Green is 0
    # Original Foreground: White (255, 255, 255) -> Green is 255
    # Therefore, the Green channel is a perfect Mask for "how much White is in this pixel".
    
    # Target Background: Navy Blue (Primary-900: #1e3a8a -> RGB 30, 58, 138)
    bg_color = (30, 58, 138)
    
    data = img.getdata()
    newData = []
    
    for item in data:
        r, g, b, a = item
        
        # 'g' is our alpha factor (0 to 255)
        # Factor 0.0 to 1.0
        factor = g / 255.0
        
        # Linear Interpolation (Lerp)
        # NewColor = Background * (1 - factor) + White * factor
        
        new_r = int(bg_color[0] * (1 - factor) + 255 * factor)
        new_g = int(bg_color[1] * (1 - factor) + 255 * factor)
        new_b = int(bg_color[2] * (1 - factor) + 255 * factor)
        
        # Set alpha to 255 (Opaque)
        newData.append((new_r, new_g, new_b, 255))
        
    img.putdata(newData)
    img.save(output_path, "PNG")
    print(f"Saved smart-swapped logo to {output_path}")

if __name__ == "__main__":
    smart_swap(
        r"c:\Users\Ivan.Corona\.gemini\antigravity\scratch\toolcrib\frontend\public\wasion_logo_large.png",
        r"c:\Users\Ivan.Corona\.gemini\antigravity\scratch\toolcrib\frontend\public\wasion_logo_large.png"
    )
