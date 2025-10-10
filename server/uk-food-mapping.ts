/**
 * UK to US food term mapping for better USDA database lookups
 * IMPORTANT: Only map unambiguous UK-specific terms to avoid breaking US food names
 */
export const UK_TO_US_FOOD_MAP: Record<string, string> = {
  // Vegetables (UK-specific terms)
  "aubergine": "eggplant",
  "courgette": "zucchini",
  "rocket": "arugula",
  "spring onion": "scallion",
  "spring onions": "scallions",
  "mangetout": "snow peas",
  "swede": "rutabaga",
  
  // Meats (UK-specific terms - be specific to avoid corrupting "lamb mince", "quorn mince", etc.)
  "beef mince": "ground beef",
  "minced beef": "ground beef",
  "pork mince": "ground pork", 
  "minced pork": "ground pork",
  "lamb mince": "ground lamb",
  "minced lamb": "ground lamb",
  "turkey mince": "ground turkey",
  "minced turkey": "ground turkey",
  "gammon": "ham",
  "back bacon": "canadian bacon",
  
  // Breakfast cereals (UK-specific)
  "weetabix": "Weetabix cereal biscuit",
  "weetabix cereal": "Weetabix cereal biscuit",
  
  // Dairy (UK-specific)
  "single cream": "light cream",
  "double cream": "heavy cream",
  
  // Other UK-specific foods
  "coriander": "cilantro",
  "porridge": "oatmeal",
  
  // UK snacks - ONLY map specific UK crisp brands/packets
  "packet of crisps": "bag of potato chips",
  "bag of crisps": "bag of potato chips",
  "walkers crisps": "potato chips",
  "ready salted crisps": "ready salted potato chips",
};

/**
 * Pre-process food text to convert UK terms to US equivalents
 * This improves accuracy when looking up nutrition data in USDA database
 * 
 * NOTE: This function is conservative and only replaces unambiguous UK-specific terms.
 * It does NOT replace generic words like "chips" or "biscuit" that have different meanings
 * in US English (chocolate chips, biscuit gravy, etc.)
 */
export function mapUKFoodTerms(text: string): string {
  let mappedText = text;
  
  // Apply each mapping with word boundaries for precise matching
  for (const [ukTerm, usTerm] of Object.entries(UK_TO_US_FOOD_MAP)) {
    // Case-insensitive replacement with word boundaries
    const regex = new RegExp(`\\b${ukTerm}\\b`, 'gi');
    mappedText = mappedText.replace(regex, usTerm);
  }
  
  // Only log if something actually changed
  if (mappedText !== text) {
    console.log(`🇬🇧→🇺🇸 Food mapping: "${text}" → "${mappedText}"`);
  }
  
  return mappedText;
}

/**
 * Extract quantity multiplier from portion text
 * Examples:
 *   "4 Weetabix" → { quantity: 4, foodName: "Weetabix" }
 *   "2 large eggs" → { quantity: 2, foodName: "large eggs" }
 *   "one apple" → { quantity: 1, foodName: "apple" }
 *   "banana" → { quantity: 1, foodName: "banana" }
 */
export function extractQuantity(portionText: string): { quantity: number; foodName: string } {
  // Remove leading/trailing whitespace
  const text = portionText.trim();
  
  // Try to match patterns like "4 Weetabix", "2 eggs", "one apple"
  const numberMatch = text.match(/^(\d+(?:\.\d+)?)\s+(.+)$/);
  if (numberMatch) {
    return {
      quantity: parseFloat(numberMatch[1]),
      foodName: numberMatch[2].trim()
    };
  }
  
  // Match word numbers
  const wordNumbers: Record<string, number> = {
    'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
    'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
    'a': 1, 'an': 1
  };
  
  const wordMatch = text.match(/^(one|two|three|four|five|six|seven|eight|nine|ten|a|an)\s+(.+)$/i);
  if (wordMatch) {
    const wordNum = wordMatch[1].toLowerCase();
    return {
      quantity: wordNumbers[wordNum] || 1,
      foodName: wordMatch[2].trim()
    };
  }
  
  // Default: no quantity multiplier
  return {
    quantity: 1,
    foodName: text
  };
}
