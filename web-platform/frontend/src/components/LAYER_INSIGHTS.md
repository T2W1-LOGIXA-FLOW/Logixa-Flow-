# UnifiedBackground2 - Layer Insights Documentation

## Overview
This document provides detailed insights into each layer of the `UnifiedBackground2.tsx` component, which is designed for testing and debugging the background layer system.

---

## Layer Structure (Bottom to Top)

### Layer 1: Base Background Layer

#### ဘာသာပြန်: အောက်ခံအရောင်သက်သက်

| Property      | Value                                            |
|---------------|--------------------------------------------------|
| Visual Effect | Solid color canvas                               |
| Color         | `hsl(222, 47%, 12%)` - Ocean Blue               |
| Z-Index       | 0                                                |
| Performance   | 🟢 Low                                           |
| Purpose       | Page ရဲ့ အခြေခံအရောင်ကို သတ်မှတ်ခြင်း |

**Description:**

- Page ရဲ့ အောက်ခံအရောင်သက်သက်ပဲ ဖြစ်ပါတယ်
- Dark mode မှာဆိုရင် `#05070b` (ရေနက်ပြာ-မည်း) အရောင်ရှိတဲ့ canvas အလွတ်ကြီးတစ်ခုလို့ မြင်ကြည့်နိုင်ပါတယ်

- အခြား layer တွေအတွက် အခြေခံအဖြစ် အလုပ်လုပ်ပါတယ်


---

### Layer 2: Vertical Dark Gradient

#### ဘာသာပြန်: အလယ်အောက်လွှာ

| Property      | Value                                          |
|---------------|------------------------------------------------|
| Visual Effect | Linear gradient wash                           |
| Gradient      | Top to bottom fade                             |
| Opacity       | 0.5                                            |
| Z-Index       | 1                                              |
| Performance   | 🟢 Low                                         |
| Purpose       | Page ကို depth (အနက်) ရှိသွားစေခြင်း         |

**Description:**

- Base layer ပေါ်မှာ အပေါ်ကနေ အောက်ကို မှောင်သွားတဲ့ gradient တစ်ခု ဖြန့်ခင်းထားတာပါ
- ဒါက page ကို depth (အနက်) ရှိသွားစေပြီး စာလုံးတွေကို ပိုပေါ်လွင်စေပါတယ်
- CSS: `linear-gradient(180deg, rgba(15, 23, 42, 0.3), rgba(15, 23, 42, 0.1))`


---

### Layer 3: Static Corner Glows

#### ဘာသာပြန်: အလယ်လွှာ

| Property      | Value                                  |
|---------------|----------------------------------------|
| Visual Effect | Radial gradient glows                  |
| Cyan Glow     | Top-left corner (5%, 5%)               |
| Orange Glow   | Bottom-right corner (95%, 95%)         |
| Z-Index       | 2                                      |
| Performance   | 🟢 Low                                 |
| Purpose       | Brand vibe ကို ပေးခြင်း                 |

**Color Details:**

- **Cyan:** `rgba(0, 255, 255, 0.4)` - Bright cyan for tech feel
- **Orange:** `rgba(255, 140, 0, 0.3)` - Warm orange for contrast


**Description:**

- ဒီ layer မှာတော့ Cyan (အပြာနု) ကို ဘယ်ဘက်အပေါ်ထောင့်မှာ၊ Orange (လိမ္မော်) ကို ညာဘက်အောက်ထောင့်မှာ ဖြန့်ကျဲထားပါတယ်
- ဒါက page ရဲ့ brand vibe ကို ပေးတဲ့ static light layers တွေပါ
- Radius: 35rem (approximately 560px)


---

### Layer 4: Interactive Mouse Glow

#### ဘာသာပြန်: အလယ်အပေါ်လွှာ

| Property      | Value                                   |
|---------------|-----------------------------------------|
| Visual Effect | Cursor-following radial glow           |
| Size          | 400px × 400px                          |
| Color         | `rgba(0, 255, 255, 0.08)` - Subtle cyan |
| Z-Index       | 3                                       |
| Performance   | 🟡 Medium                              |
| Purpose       | User interaction ကို enhance လုပ်ခြင်း    |

**Description:**

- ဒါကတော့ AmbientGlow component ကနေ လာတာပါ
- Cursor ကို လိုက်ပြီး လည်နေတဲ့ အလင်းဝိုင်း
- Scroll ဆွဲရင်လည်း နေရာမရွေ့ဘဲ cursor အနီးမှာ အမြဲရှိနေတဲ့ အလွန်နူးညံ့တဲ့ အလင်းစက်
- Transform: `translate(-50%, -50%)` - Center on cursor


**Performance Note:**

- Mouse move event listener ကို သုံးတာဖြစ်လို့ medium impact ရှိပါတယ်
- Throttle လုပ်ဖို့ အကြံပြုပါတယ်


---

### Layer 5: Floating Glows (Fixed Position)

#### ဘာသာပြန်: အလယ်အပေါ်လွှာ

| Property      | Value                               |
|---------------|-------------------------------------|
| Visual Effect | Fixed ambient light glows           |
| Cyan Glow     | Top-left (-10%, -10%)               |
| Orange Glow   | Bottom-right (-10%, -10%)           |
| Size          | 50vw × 50vw each                    |
| Z-Index       | 4                                   |
| Performance   | 🟢 Low                              |
| Purpose       | Persistent ambient light effect    |

**Color Details:**

- **Cyan:** `rgba(0, 255, 255, 0.15)` - Brighter than Layer 4
- **Orange:** `rgba(255, 140, 0, 0.1)` - Subtle warm glow


**Description:**

- ဒါကတော့ fixed ဖြစ်နေတဲ့အတွက် scroll ဆွဲရင်လည်း နေရာမရွေ့ဘဲ မျက်နှာပြင်ပေါ်မှာ အမြဲရှိနေတဲ့ အလွန်နူးညံ့တဲ့ အလင်းစက်ကြီးတွေလို ဖြစ်နေပါတယ်
- Viewport ပေါ်မှာ fixed ဖြစ်တဲ့အတွက် scroll behavior မရှိပါဘူး


---

## Testing & Debug Features

### Debug Mode

Enable `debugMode={true}` prop to show:
- Layer toggle controls
- Performance impact indicators
- Real-time mouse position
- Active layer count
- Detailed layer information


### Layer Labels

Enable `showLayerLabels={true}` prop to show:
- Layer names on each layer
- Layer structure summary
- Visual identification


### Example Usage

```tsx
<UnifiedBackground2
  variant="full"
  debugMode={true}
  showLayerLabels={true}
/>
```

---

## Performance Optimization Tips

### 1. Layer Merging

Combine Layer 2 and Layer 3 using CSS multiple backgrounds:
```css
background:
  linear-gradient(180deg, rgba(15, 23, 42, 0.3), rgba(15, 23, 42, 0.1)),
  radial-gradient(circle at 5% 5%, rgba(0, 255, 255, 0.4), transparent 35rem),
  radial-gradient(circle at 95% 95%, rgba(255, 140, 0, 0.3), transparent 35rem);
```

### 2. Mouse Event Throttling

Add throttling to mouse move event for better performance:
```tsx
const throttledMouseMove = useCallback(
  throttle((e: MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  }, 16), // ~60fps
  []
);
```

### 3. Mobile Optimization
- Reduce blur radius on mobile
- Disable Layer 4 (mouse glow) on touch devices
- Use `prefers-reduced-motion` media query

### 4. Conditional Rendering
- Only render Layer 5 when `variant="full"`
- Use Intersection Observer for hero section layers
- Lazy load expensive effects

---

## Layer Visibility Matrix

| Layer | Desktop | Mobile | Admin | Hero | Scroll |
|-------|---------|--------|-------|------|--------|
| 1. Base | ✅ | ✅ | ❌ | ✅ | Fixed |
| 2. Gradient | ✅ | ✅ | ❌ | ✅ | Fixed |
| 3. Corner Glows | ✅ | ✅ | ❌ | ✅ | Fixed |
| 4. Mouse Glow | ✅ | ❌ | ❌ | ✅ | Follows |
| 5. Floating Glows | ✅ | ✅ | ❌ | ✅ | Fixed |

---

## Color Palette Reference

| Color | RGB | HSL | Usage |
|-------|-----|-----|-------|
| Ocean Blue | 13, 18, 43 | hsl(222, 47%, 12%) | Base background |
| Cyan | 0, 255, 255 | hsl(180, 100%, 50%) | Accent glows |
| Orange | 255, 140, 0 | hsl(33, 100%, 50%) | Warm accent |
| Dark Slate | 15, 23, 42 | hsl(217, 47%, 11%) | Gradient overlay |

---

## Troubleshooting

### Issue: Layers not visible
- Check z-index values
- Verify opacity settings
- Ensure parent container has `pointer-events-none`

### Issue: Performance lag
- Disable Layer 4 (mouse glow)
- Reduce blur radius
- Use `will-change` CSS property

### Issue: Colors look wrong
- Check browser color profile
- Verify CSS gradient syntax
- Test on different monitors

---

## Future Enhancements

1. **3D Globe Layer** - WebGL-based animated globe for hero section
2. **Hero Interaction Overlays** - Pulse animations and wash effects
3. **Particle System** - Floating particles for enhanced visual depth
4. **Scroll-triggered Animations** - Layer animations based on scroll position
5. **Theme Variants** - Dark, light, and custom color themes

---

## References

- Original: `UnifiedBackground.tsx`
- Test Version: `UnifiedBackground2.tsx`
- Documentation: This file
