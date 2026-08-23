#!/usr/bin/env python3
"""
Batch convert PNG toolbar icons to vector SVG using potrace.
Preserves original icon colors by tracing the alpha channel.
"""
import os
import potrace
import numpy as np
from PIL import Image

INPUT_DIR = r"D:\6\恋爱小程序\素材\首页\最终\拆分图标-精修版\07-toolbar"
OUTPUT_DIR = os.path.join(INPUT_DIR, "svg-output")
os.makedirs(OUTPUT_DIR, exist_ok=True)


def get_dominant_color(img: Image.Image) -> tuple:
    """Get the most common non-transparent color from the image."""
    img_rgba = img.convert("RGBA")
    pixels = list(img_rgba.getdata())
    color_count = {}
    for r, g, b, a in pixels:
        if a > 128:  # non-transparent
            color = (r, g, b)
            color_count[color] = color_count.get(color, 0) + 1
    if not color_count:
        return (0, 0, 0)
    return max(color_count, key=color_count.get)


def png_to_svg(input_path: str, output_path: str):
    """Convert a single PNG to vector SVG using potrace bitmap tracing."""
    img = Image.open(input_path).convert("RGBA")
    
    # Get dominant color before conversion
    dominant_color = get_dominant_color(img)
    
    # Extract alpha channel as the tracing mask
    alpha = img.split()[3]  # Alpha channel
    width, height = img.size
    
    # Create binary bitmap from alpha channel
    # Potrace treats non-zero as "on" (black), zero as "off" (white)
    alpha_array = np.array(alpha)
    bitmap_data = (alpha_array > 128).astype(np.uint8)
    
    # Create potrace bitmap
    bmp = potrace.Bitmap(bitmap_data)
    
    # Trace the bitmap to get vector paths
    path = bmp.trace(
        turdsize=2,        # suppress speckles smaller than this
        turnpolicy=potrace.POTRACE_TURNPOLICY_MINORITY,
        alphamax=1.0,      # corner threshold
        opticurve=True,    # use optimization
        opttolerance=0.2,  # optimization tolerance
    )
    
    # Generate SVG content
    r, g, b = dominant_color
    fill_color = f"rgb({r},{g},{b})"
    
    svg_paths = []
    # Traverse the path tree
    for curve in path:
        # Get the curve points
        segments = []
        start = curve.start_point
        segments.append(f"M {start.x:.4f},{start.y:.4f}")
        
        for segment in curve:
            if segment.is_corner:
                # Corner segment (line to corner, line from corner)
                segments.append(f"L {segment.c.x:.4f},{segment.c.y:.4f}")
                segments.append(f"L {segment.end_point.x:.4f},{segment.end_point.y:.4f}")
            else:
                # Bezier curve segment
                segments.append(
                    f"C {segment.c1.x:.4f},{segment.c1.y:.4f} "
                    f"{segment.c2.x:.4f},{segment.c2.y:.4f} "
                    f"{segment.end_point.x:.4f},{segment.end_point.y:.4f}"
                )
        
        # Close path and determine fill direction
        segments.append("Z")
        path_d = " ".join(segments)
        
        # Determine fill rule based on winding direction
        fill_rule = "evenodd"
        svg_paths.append(f'  <path d="{path_d}" fill="{fill_color}" fill-rule="{fill_rule}"/>')
    
    # Build complete SVG
    svg_content = f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" 
     viewBox="0 0 {width} {height}" 
     width="{width}" height="{height}">
{chr(10).join(svg_paths)}
</svg>'''
    
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(svg_content)
    
    return dominant_color, width, height


def main():
    png_files = sorted([f for f in os.listdir(INPUT_DIR) if f.lower().endswith(".png")])
    
    print(f"Found {len(png_files)} PNG files to convert")
    print(f"Output directory: {OUTPUT_DIR}")
    print("-" * 60)
    
    for png_file in png_files:
        input_path = os.path.join(INPUT_DIR, png_file)
        svg_file = os.path.splitext(png_file)[0] + ".svg"
        output_path = os.path.join(OUTPUT_DIR, svg_file)
        
        try:
            color, w, h = png_to_svg(input_path, output_path)
            file_size = os.path.getsize(output_path)
            print(f"[OK] {png_file} -> {svg_file}  "
                  f"({w}x{h}, color=rgb{color}, {file_size:,} bytes)")
        except Exception as e:
            print(f"[FAIL] {png_file}: {e}")
    
    print("-" * 60)
    print("Done!")


if __name__ == "__main__":
    main()
