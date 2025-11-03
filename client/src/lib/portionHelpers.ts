/**
 * Generate appropriate portion size options based on food name and type
 */
export function getPortionOptions(foodName: string, currentPortion: string): string[] {
  const nameLower = foodName.toLowerCase();
  const portionLower = currentPortion.toLowerCase();
  
  // Extract current quantity if present
  const quantityMatch = portionLower.match(/^(\d+(?:\.\d+)?)\s*/);
  const currentQuantity = quantityMatch ? parseFloat(quantityMatch[1]) : 1;
  
  // Whole potatoes (jacket, baked, roasted, boiled)
  if ((nameLower.includes('potato') || portionLower.includes('potato')) && 
      !nameLower.includes('chip') && !nameLower.includes('fries') && 
      !nameLower.includes('mashed') && !nameLower.includes('salad') && 
      !nameLower.includes('sweet')) {
    return [
      '1 small (150g)',
      '1 medium (200g)',
      '1 large (300g)',
      '2 small (300g)',
      '2 medium (400g)',
      '2 large (600g)'
    ];
  }
  
  // Eggs
  if (nameLower.includes('egg') && !nameLower.includes('plant') && !nameLower.includes('salad')) {
    return [
      '1 egg (50g)',
      '2 eggs (100g)',
      '3 eggs (150g)',
      '4 eggs (200g)'
    ];
  }
  
  // Chicken breast
  if (nameLower.includes('chicken') && nameLower.includes('breast')) {
    return [
      '1 small breast (100g)',
      '1 medium breast (150g)',
      '1 large breast (200g)',
      '2 small breasts (200g)',
      '2 medium breasts (300g)'
    ];
  }
  
  // General meat/fish (steak, salmon, etc.)
  if (nameLower.match(/steak|salmon|cod|tuna|pork|beef|lamb|fish/)) {
    return [
      '100g',
      '150g',
      '200g',
      '250g',
      '300g'
    ];
  }
  
  // Bread and toast
  if (nameLower.includes('bread') || nameLower.includes('toast')) {
    return [
      '1 slice (30g)',
      '2 slices (60g)',
      '3 slices (90g)',
      '4 slices (120g)'
    ];
  }
  
  // Rice and pasta
  if (nameLower.match(/rice|pasta|noodle/)) {
    return [
      '100g cooked',
      '150g cooked',
      '200g cooked',
      '250g cooked',
      '300g cooked'
    ];
  }
  
  // Drinks (water, juice, milk, coffee, tea)
  if (nameLower.match(/water|juice|milk|coffee|tea|drink|beverage|soda|cola/)) {
    return [
      '100ml',
      '200ml',
      '250ml',
      '330ml',
      '500ml',
      '1 cup (240ml)',
      '1 glass (250ml)'
    ];
  }
  
  // Soup
  if (nameLower.includes('soup')) {
    return [
      '1 cup (240ml)',
      '1 bowl (300ml)',
      '1 large bowl (400ml)'
    ];
  }
  
  // Fruit (apple, banana, orange, etc.)
  if (nameLower.match(/apple|banana|orange|pear|peach|plum/)) {
    return [
      '1 small (80g)',
      '1 medium (120g)',
      '1 large (180g)',
      '2 small (160g)',
      '2 medium (240g)'
    ];
  }
  
  // Berries
  if (nameLower.match(/berr|strawberr|blueberr|raspberr/)) {
    return [
      '50g (handful)',
      '100g',
      '150g',
      '200g',
      '1 cup (150g)'
    ];
  }
  
  // Nuts
  if (nameLower.match(/nut|almond|walnut|cashew|peanut/)) {
    return [
      '25g (small handful)',
      '50g (handful)',
      '75g',
      '100g'
    ];
  }
  
  // Cheese
  if (nameLower.includes('cheese')) {
    return [
      '25g',
      '50g',
      '75g',
      '100g',
      '1 slice (30g)'
    ];
  }
  
  // Yogurt
  if (nameLower.includes('yogurt') || nameLower.includes('yoghurt')) {
    return [
      '100g (small pot)',
      '150g (standard pot)',
      '200g',
      '1 cup (240g)'
    ];
  }
  
  // Generic fallback - weight-based options
  return [
    '50g',
    '100g',
    '150g',
    '200g',
    '250g',
    '300g'
  ];
}

/**
 * Convert a portion string to grams for nutrition calculation
 * This mirrors the server-side logic in ai-manager.ts
 */
export function portionToGrams(portion: string): number {
  const portionLower = portion.toLowerCase().trim();
  
  // Direct gram/kg measurements
  const kgMatch = portionLower.match(/(\d+(?:\.\d+)?)\s*kg/);
  if (kgMatch) return parseFloat(kgMatch[1]) * 1000;
  
  const gMatch = portionLower.match(/(\d+(?:\.\d+)?)\s*g\b/);
  if (gMatch) return parseFloat(gMatch[1]);
  
  // Volume to weight conversions (ml)
  const mlMatch = portionLower.match(/(\d+(?:\.\d+)?)\s*ml/);
  if (mlMatch) return parseFloat(mlMatch[1]); // 1ml ≈ 1g for water-based liquids
  
  // Common portion descriptions
  if (portionLower.includes('small')) {
    if (portionLower.includes('potato')) return 150;
    if (portionLower.includes('breast')) return 100;
    if (portionLower.includes('handful')) return 25;
    return 80;
  }
  
  if (portionLower.includes('medium')) {
    if (portionLower.includes('potato')) return 200;
    if (portionLower.includes('breast')) return 150;
    return 120;
  }
  
  if (portionLower.includes('large')) {
    if (portionLower.includes('potato')) return 300;
    if (portionLower.includes('breast')) return 200;
    return 180;
  }
  
  // Count-based items
  const eggMatch = portionLower.match(/(\d+)\s*eggs?/);
  if (eggMatch) return parseInt(eggMatch[1]) * 50;
  
  const sliceMatch = portionLower.match(/(\d+)\s*slices?/);
  if (sliceMatch) return parseInt(sliceMatch[1]) * 30;
  
  // Cup/bowl measurements
  if (portionLower.includes('cup')) return 240;
  if (portionLower.includes('bowl')) {
    if (portionLower.includes('large')) return 400;
    return 300;
  }
  if (portionLower.includes('glass')) return 250;
  if (portionLower.includes('handful')) return 50;
  
  // Extract any leading number and use it as a multiplier
  const numMatch = portionLower.match(/^(\d+(?:\.\d+)?)/);
  if (numMatch) {
    const num = parseFloat(numMatch[1]);
    // If just a number, assume it's grams
    if (/^\d+(?:\.\d+)?$/.test(portionLower.trim())) {
      return num;
    }
    // Otherwise use as multiplier (e.g., "2 potatoes" = 2 * 200g)
    return num * 100;
  }
  
  // Default fallback
  return 100;
}
