#!/usr/bin/env python3
"""
Batch convert PNG toolbar icons to multi-color vector SVG.
Uses color quantization + per-layer potrace tracing for true vector output.
"""
import os
import potrace
import numpy as np
from PIL import Image

INPUT_DIR = r"D:\6\恋爱小程序\素材\首页\最终\拆分图标-精修版\07-toolbar"
OUTPUT_DIR = os.path.join(INPUT_DIR, "svg-output")
os.makedirs(OUTPUT_DIR, exist_ok=True)


def quantize_image(img: Image.Image, max_colors: int = 16) -> Image.Image:
    """Reduce image to limited palette while preserving alpha."""
    rgba = img.convert("RGBA")
    rgb = rgba.convert("RGB")
    quantized_rgb = rgb.quantize(colors=max_colors, method=Image.Quantize.MEDIANCUT)
    quantized_rgb = quantized_rgb.convert("RGB")
    
    # Recombine with original alpha
    result = Image.new("RGBA", rgba.size)
    rgb_data = quantized_rgb.load()
    alpha_data = rgba.split()[3].load()
    result_data = result.load()
    
    for y in range(rgba.size[1]):
        for x in range(rgba.size[0]):
            r, g, b = rgb_data[x, y]
            a = alpha_data[x, y]
            result_data[x, y] = (r, g, b, a)
    
    return result


def get_palette(img: Image.Image) -> list:
    """Get unique RGB colors from quantized image (ignoring fully transparent)."""
    colors = {}
    rgba = img.convert("RGBA")
    data = rgba.load()
    w, h = rgba.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = data[x, y]
            if a > 10:  # skip fully transparent
                color = (r, g, b)
                if color not in colors:
                    colors[color] = 0
                colors[color] += a  # weight by alpha for better representation
    # Sort by frequency (most common first)
    sorted_colors = sorted(colors.items(), key=lambda x: -x[1])
    return [c[0] for c in sorted_colors]


def color_mask(img: Image.Image, target_color: tuple, tolerance: int = 15) -> np.ndarray:
    """Create a binary mask where pixels matching target_color (within tolerance) are 1."""
    rgba = img.convert("RGBA")
    data = rgba.load()
    w, h = rgba.size
    
    mask = np.zeros((h, w), dtype=np.uint8)
    tr, tg, tb = target_color
    
    for y in range(h):
        for x in range(w):
            r, g, b, a = data[x, y]
            if a < 10:
                continue
            # Check color distance
            dist = ((r - tr) ** 2 + (g - tg) ** 2 + (b - tb) ** 2) ** 0.5
            if dist < tolerance:
                mask[y, x] = 1
    
    return mask


def smooth_edges(img: Image.Image, target_color: tuple, tolerance: int = 15) -> np.ndarray:
    """Create a float mask with smooth alpha-based blending for anti-aliasing."""
    rgba = img.convert("RGBA")
    data = rgba.load()
    w, h = rgba.size
    
    mask = np.zeros((h, w), dtype=np.float64)
    tr, tg, tb = target_color
    
    for y in range(h):
        for x in range(w):
            r, g, b, a = data[x, y]
            if a < 5:
                continue
            dist = ((r - tr) ** 2 + (g - tg) ** 2 + (b - tb) ** 2) ** 0.5
            if dist < tolerance:
                # Blend: closer color = more opaque
                intensity = max(0, 1.0 - dist / tolerance)
                mask[y, x] = intensity * (a / 255.0)
    
    return mask


def mask_to_potrace_bitmap(mask: np.ndarray, threshold: float = 0.3) -> potrace.Bitmap:
    """Convert float mask to potrace bitmap using threshold."""
    binary = (mask > threshold).astype(np.uint8)
    return potrace.Bitmap(binary)


def trace_mask_to_svg_paths(mask: np.ndarray, threshold: float = 0.3) -> list:
    """Trace a single color mask and return SVG path strings."""
    bmp = mask_to_potrace_bitmap(mask, threshold)
    path = bmp.trace(
        turdsize=1,
        turnpolicy=potrace.POTRACE_TURNPOLICY_MINORITY,
        alphamax=1.0,
        opticurve=True,
        opttolerance=0.2,
    )
    
    paths = []
    for curve in path:
        segments = []
        start = curve.start_point
        segments.append(f"M{start.x:.2f},{start.y:.2f}")
        
        for segment in curve:
            if segment.is_corner:
                segments.append(f"L{segment.c.x:.2f},{segment.c.y:.2f}")
                segments.append(f"L{segment.end_point.x:.2f},{segment.end_point.y:.2f}")
            else:
                segments.append(
                    f"C{segment.c1.x:.2f},{segment.c1.y:.2f} "
                    f"{segment.c2.x:.2f},{segment.c2.y:.2f} "
                    f"{segment.end_point.x:.2f},{segment.end_point.y:.2f}"
                )
        
        segments.append("Z")
        paths.append(" ".join(segments))
    
    return paths


def png_to_svg(input_path: str, output_path: str, max_colors: int = 16):
    """Convert a single PNG to multi-color vector SVG."""
    img = Image.open(input_path).convert("RGBA")
    w, h = img.size
    
    # Quantize to reduce color complexity
    quantized = quantize_image(img, max_colors)
    
    # Get unique colors (sorted by dominance)
    palette = get_palette(quantized)
    
    # For each color, create a mask and trace
    all_svg_paths = []
    tolerance = 20  # color matching tolerance
    
    for color in palette:
        mask = smooth_edges(quantized, color, tolerance)
        
        # Check if this color has enough pixels to be worth tracing
        if mask.sum() < 5:
            continue
        
        paths = trace_mask_to_svg_paths(mask, threshold=0.2)
        r, g, b = color
        fill = f"#{r:02x}{g:02x}{b:02x}"
        
        for path_d in paths:
            all_svg_paths.append(f'  <path d="{path_d}" fill="{fill}"/>')
    
    # Build SVG
    if not all_svg_paths:
        # Fallback: just embed PNG as base64
        import base64
        with open(input_path, "rb") as f:
            b64 = base64.b64encode(f.read()).decode()
        svg = f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
     viewBox="0 0 {w} {h}" width="{w}" height="{h}">
  <image xlink:href="data:image/png;base64,{b64}" width="{w}" height="{h}"/>
</svg>'''
    else:
        svg = f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">
{chr(10).join(all_svg_paths)}
</svg>'''
    
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(svg)
    
    return len(palette), len(all_svg_paths)


def main():
    png_files = sorted([f for f in os.listdir(INPUT_DIR) if f.lower().endswith(".png")])
    
    # Clean old output
    for f in os.listdir(OUTPUT_DIR):
        if f.endswith(".svg"):
            os.remove(os.path.join(OUTPUT_DIR, f))
    
    print(f"Found {len(png_files)} PNG files to convert")
    print(f"Output directory: {OUTPUT_DIR}")
    print("-" * 70)
    
    for png_file in png_files:
        input_path = os.path.join(INPUT_DIR, png_file)
        svg_file = os.path.splitext(png_file)[0] + ".svg"
        output_path = os.path.join(OUTPUT_DIR, svg_file)
        
        try:
            n_colors, n_paths = png_to_svg(input_path, output_path, max_colors=12)
            file_size = os.path.getsize(output_path)
            print(f"[OK] {png_file} -> {svg_file}  ({n_colors} colors, {n_paths} paths, {file_size:,} bytes)")
        except Exception as e:
            print(f"[FAIL] {png_file}: {e}")
            import traceback
            traceback.print_exc()
    
    print("-" * 70)
    print("Done!")


if __name__ == "__main__":
    main()
