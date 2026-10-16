"""
AI Image Generator Service for Logixa Flow.

Provides automated, zero-cost AI banner generation for blog posts, news articles,
and supply-chain intelligence reports using modern generative models (FLUX / SDXL).
"""

from __future__ import annotations

import hashlib
import logging
import urllib.parse
from typing import Optional

logger = logging.getLogger("logixa.image_generator")

DEFAULT_STYLE = "modern minimal corporate editorial illustration, isometric 3D concept, clean lighting, supply chain logistics technology, 8k, photorealistic banner"


def build_image_prompt(title: str, category: str = "Supply Chain", context: Optional[str] = None) -> str:
    """Build a professional, safe prompt for editorial blog banners."""
    clean_title = title.replace('"', '').replace("'", "").strip()
    prompt = f"Editorial visual for article: '{clean_title}'. Theme: {category}. {DEFAULT_STYLE}"
    if context:
        prompt += f", focusing on: {context[:120]}"
    return prompt


def generate_pollinations_url(
    prompt: str,
    width: int = 1200,
    height: int = 630,
    model: str = "flux",
    seed: Optional[int] = None,
) -> str:
    """
    Generate an instant, zero-cost image URL using Pollinations.ai (FLUX model).
    Zero API keys required, 100% free, CDN-cached.
    """
    if seed is None:
        # Deterministic seed based on prompt text so repeated requests cache cleanly
        seed = int(hashlib.md5(prompt.encode("utf-8")).hexdigest()[:8], 16) % 1_000_000

    encoded = urllib.parse.quote(prompt.strip())
    url = f"https://image.pollinations.ai/prompt/{encoded}?width={width}&height={height}&model={model}&nologo=true&seed={seed}"
    logger.info("Generated AI Image URL for prompt: %s... (seed=%d)", prompt[:50], seed)
    return url


def generate_blog_banner(title: str, category: str = "Supply Chain", context: Optional[str] = None) -> str:
    """
    High-level entry point: Generate a professional 1200x630 banner URL for a blog post.
    """
    prompt = build_image_prompt(title, category, context)
    return generate_pollinations_url(prompt, width=1200, height=630, model="flux")
