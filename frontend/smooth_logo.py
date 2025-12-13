from PIL import Image, ImageFilter

def smooth_logo(input_path, output_path):
    print(f"Smoothing {input_path}...")
    img = Image.open(input_path).convert("RGBA")
    
    # Current size
    width, height = img.size
    
    # 1. Supersample: Resize to 4x the original size
    # We use Nearest first to keep the sharp edges defined before blurring
    # Or Bicubic to start smoothing immediately. Let's use Bicubic.
    new_size = (width * 4, height * 4)
    img_large = img.resize(new_size, Image.Resampling.BICUBIC)
    
    # 2. Apply explicit Gaussian Blur to soften the jagged edges
    # Radius depends on how jagged it is. 4x upscale + 2px radius is usually good.
    img_blurred = img_large.filter(ImageFilter.GaussianBlur(radius=2))
    
    # 3. Downsample back to original size using high-quality Lanczos filter
    # This averages the blurred pixels into nice anti-aliased edges
    img_smooth = img_blurred.resize((width, height), Image.Resampling.LANCZOS)
    
    # Ensure the background is still the exact Navy Blue where it should be
    # (The blur might have lightened proper background areas near text)
    # But for a logo, this marginal blending is exactly what we want (Anti-aliasing).
    
    img_smooth.save(output_path, "PNG")
    print(f"Saved smoothed logo to {output_path}")

if __name__ == "__main__":
    smooth_logo(
        r"c:\Users\Ivan.Corona\.gemini\antigravity\scratch\toolcrib\frontend\public\wasion_logo_large.png",
        r"c:\Users\Ivan.Corona\.gemini\antigravity\scratch\toolcrib\frontend\public\wasion_logo_large.png"
    )
