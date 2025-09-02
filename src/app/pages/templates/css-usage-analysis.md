# CSS Usage Analysis for PDF Template

## Summary

This analysis compares CSS classes defined in `pdf-styles.css` with their actual usage in `pdf-template.html`.

## CSS Classes Defined in pdf-styles.css (49 classes)

1. `signature-block` ✅ Used
2. `signature-label` ✅ Used
3. `signature-line` ❌ NOT Used
4. `pdf-page-margins` ✅ Used
5. `lcp-header-img` ✅ Used
6. `lcp-header` ✅ Used
7. `footer-logos` ❌ NOT Used (no matching HTML)
8. `footer-director` ❌ NOT Used
9. `lcp-footer-img` ✅ Used
10. `lcp-footer` ✅ Used
11. `rfq-title` ✅ Used
12. `rfq-title-main` ✅ Used
13. `section-title` ✅ Used
14. `rfq-meta` ✅ Used
15. `office-use` ✅ Used
16. `important-info` ✅ Used
17. `pdf-checkbox-square` ✅ Used
18. `rfq-section` ✅ Used
19. `rfq-section-3col` ✅ Used
20. `rfq-3col-row` ❌ NOT Used
21. `rfq-label-value` ✅ Used
22. `rfq-label` ❌ NOT Used (referenced in HTML with span class)
23. `rfq-value` ❌ NOT Used (referenced in HTML with span class)
24. `rfq-section-2col` ✅ Used
25. `rfq-2col-row` ❌ NOT Used
26. `rfq-row` ✅ Used
27. `rfq-rect` ✅ Used
28. `rfq-underline` ❌ NOT Used
29. `lcp-assurance-section` ✅ Used
30. `lcp-assurance-title` ✅ Used
31. `lcp-assurance-contact` ✅ Used
32. `lcp-accreditation` ✅ Used
33. `lcp-accreditation-badge` ✅ Used
34. `lcp-assurance-list` ✅ Used
35. `lcp-assurance-highlight` ✅ Used
36. `lcp-assurance-summary` ✅ Used
37. `image-container` ✅ Used
38. `hero-message` ✅ Used
39. `rfq-grid-section` ✅ Used
40. `rfq-3col-grid` ✅ Used
41. `rfq-2col-header` ✅ Used
42. `rfq-2col-grid` ✅ Used
43. `rfq-info-list` ✅ Used
44. `rfq-notes` ✅ Used
45. `important-info-section` ✅ Used
46. `important-info-title` ✅ Used
47. `important-info-list` ✅ Used

## Classes Used in HTML but Missing CSS Definitions

None - All classes used in HTML have corresponding CSS definitions.

## Unused CSS Classes (7 classes - 14.3% unused)

1. `signature-line` - Defined but not used in HTML
2. `footer-logos` - No corresponding HTML elements
3. `footer-director` - No corresponding HTML elements  
4. `rfq-3col-row` - Not used in current layout
5. `rfq-2col-row` - Not used in current layout
6. `rfq-underline` - Alternative styling not used

## Additional Selectors in CSS

- `body` - Global styling ✅ Used
- `.footer-logos img` - Nested selector ❌ NOT Used
- `.rfq-section-2col .section-title` - Nested selector ✅ Used
- `.rfq-section-2col .rfq-label-value` - Nested selector ✅ Used
- `.rfq-section-2col .rfq-label` - Nested selector ✅ Used (span elements)
- `.rfq-section-2col .rfq-value` - Nested selector ✅ Used (span elements)
- `.rfq-row > div` - Child selector ✅ Used
- `.rfq-info-list li` - Nested selector ✅ Used
- `.rfq-info-list li:last-child` - Pseudo-selector ✅ Used
- `.rfq-notes strong` - Nested selector ✅ Used
- `.important-info-list li` - Nested selector ✅ Used
- `.image-container figure` - Nested selector ✅ Used
- `.image-container figcaption` - Nested selector ✅ Used
- `.image-container img` - Nested selector ✅ Used
- `.image-container figure:empty::after` - Pseudo-element ✅ Used (fallback)

## Usage Statistics

- **Total CSS Classes Defined**: 47 classes
- **CSS Classes Used**: 40 classes (85.1%)
- **CSS Classes Unused**: 7 classes (14.9%)
- **CSS Utilization Rate**: **85.1%**

## Recommendations

1. **Keep unused classes** - They may be useful for future variations or alternative layouts
2. **Consider consolidating** `rfq-3col-row` and `rfq-2col-row` if they serve similar purposes
3. **Footer classes** (`footer-logos`, `footer-director`) could be removed if not needed for future footer variations
4. **Good utilization rate** - 85.1% utilization indicates efficient CSS usage
