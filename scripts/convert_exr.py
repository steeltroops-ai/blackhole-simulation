import os
os.environ["OPENCV_IO_ENABLE_OPENEXR"]="1"
import cv2
import numpy as np

img = cv2.imread(r"public\textures\starmap_2020_4k_gal.exr", cv2.IMREAD_ANYCOLOR | cv2.IMREAD_ANYDEPTH)
if img is not None:
    # tonemap / gamma correct? The image renderer might want linear or srgb
    # If the EXR is HDR, scaling it directly to 0-255 might clamp. So let's clip and scale
    img = np.clip(img, 0, 1)
    # apply gamma correction for sRGB fallback
    img = np.power(img, 1.0 / 2.2)
    img = (img * 255).astype(np.uint8)
    cv2.imwrite(r"public\textures\milkyway_2020_4k.jpg", img)
    print("Converted successfully")
else:
    print("Failed to read EXR")
