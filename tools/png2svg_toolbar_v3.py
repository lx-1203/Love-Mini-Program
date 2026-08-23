#!/usr/bin/env python3
"""
Batch convert PNG toolbar icons to high-quality vector SVG using vtracer.
vtracer produces smooth, multi-color vector paths that match the original closely.
"""
import os
import vtracer

INPUT_DIR = r"D:\6\恋爱小程序\素材\首页\最终\拆分图标-精修版\07-toolbar"
OUTPUT_DIR = os.path.join(INPUT_DIR, "svg-output")
os.makedirs(OUTPUT_DIR, exist_ok=True)


def convert_png_to_svg(input_path: str, output_path: str):
    """Convert a single PNG to vector SVG using vtracer."""
    vtracer.convert_image_to_svg_py(
        image_path=input_path,
        out_path=output_path,
        colormode="color",           # full color mode
        hierarchical="stacked",       # stacked layers for correct appearance
        mode="spline",               # smooth bezier curves
        filter_speckle=4,            # remove small noise speckles
        color_precision=6,           # high color precision (more unique colors preserved)
        layer_difference=16,         # color layer separation threshold
        corner_threshold=60,         # corner detection angle
        length_threshold=4.0,        # min segment length
        max_iterations=10,           # optimization iterations
        splice_threshold=45,         # splice angle
        path_precision=3,            # decimal places in path coords
    )


def main():
    png_files = sorted([f for f in os.listdir(INPUT_DIR) if f.lower().endswith(".png")])
    
    # Clean old output
    for f in os.listdir(OUTPUT_DIR):
        if f.endswith(".svg") and "plain" not in f and "test" not in f:
            os.remove(os.path.join(OUTPUT_DIR, f))
    
    print(f"Found {len(png_files)} PNG files to convert")
    print(f"Output directory: {OUTPUT_DIR}")
    print("-" * 70)
    
    success = 0
    fail = 0
    
    for png_file in png_files:
        input_path = os.path.join(INPUT_DIR, png_file)
        svg_file = os.path.splitext(png_file)[0] + ".svg"
        output_path = os.path.join(OUTPUT_DIR, svg_file)
        
        try:
            convert_png_to_svg(input_path, output_path)
            file_size = os.path.getsize(output_path)
            print(f"[OK] {png_file} -> {svg_file}  ({file_size:,} bytes)")
            success += 1
        except Exception as e:
            print(f"[FAIL] {png_file}: {e}")
            fail += 1
    
    print("-" * 70)
    print(f"Done! {success} converted, {fail} failed")


if __name__ == "__main__":
    main()
