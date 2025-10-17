import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";

interface Recipe {
  id: string;
  name: string;
  ingredients: string[];
}

interface ShoppingListDialogProps {
  isOpen: boolean;
  onClose: () => void;
  recipes: Recipe[];
}

interface ParsedIngredient {
  original: string;
  quantity: number;
  unit: string;
  ingredient: string;
}

function parseIngredient(ingredientStr: string): ParsedIngredient {
  // Try to parse quantity, unit, and ingredient name
  // Examples: "2 cups flour", "1/2 cup milk", "1 1/2 cups flour", "3 large eggs", "salt to taste", "½ cup sugar"
  
  // Convert Unicode fractions to regular fractions
  const unicodeFractionMap: Record<string, string> = {
    '½': '1/2',
    '⅓': '1/3',
    '⅔': '2/3',
    '¼': '1/4',
    '¾': '3/4',
    '⅕': '1/5',
    '⅖': '2/5',
    '⅗': '3/5',
    '⅘': '4/5',
    '⅙': '1/6',
    '⅚': '5/6',
    '⅛': '1/8',
    '⅜': '3/8',
    '⅝': '5/8',
    '⅞': '7/8'
  };
  
  let normalized = ingredientStr;
  Object.keys(unicodeFractionMap).forEach(unicode => {
    // Handle attached fractions like "1½" by adding a space before replacement
    const pattern = new RegExp(`(\\d)${unicode}`, 'g');
    normalized = normalized.replace(pattern, `$1 ${unicodeFractionMap[unicode]}`);
    // Handle standalone fractions like "½ cup"
    normalized = normalized.replace(unicode, unicodeFractionMap[unicode]);
  });
  
  // Handle mixed numbers (e.g., "1 1/2 cups") and standalone fractions/decimals
  const mixedNumberMatch = normalized.match(/^(\d+)\s+(\d+\/\d+|\d+\.\d+)\s+(.*)$/);
  const fractionMatch = normalized.match(/^(\d+\/\d+|\d+\.\d+|\d+)\s+(.*)$/);

  
  if (mixedNumberMatch) {
    // Mixed number like "1 1/2"
    const wholeNumber = parseInt(mixedNumberMatch[1]);
    const fraction = eval(mixedNumberMatch[2]); // Convert "1/2" to 0.5
    const quantity = wholeNumber + fraction;
    const rest = mixedNumberMatch[3].trim();
    
    // Try to extract unit
    const unitMatch = rest.match(/^(cup|cups|tbsp|tsp|oz|lb|g|kg|ml|l|tablespoon|tablespoons|teaspoon|teaspoons|pound|pounds|ounce|ounces|gram|grams|kilogram|kilograms|liter|liters|milliliter|milliliters)\s+(.+)$/i);
    if (unitMatch) {
      return {
        original: ingredientStr,
        quantity,
        unit: unitMatch[1].toLowerCase(),
        ingredient: unitMatch[2].trim()
      };
    }
    
    // No unit, just quantity and ingredient
    return {
      original: ingredientStr,
      quantity,
      unit: '',
      ingredient: rest
    };
  } else if (fractionMatch) {
    const quantity = eval(fractionMatch[1]); // Convert fractions like "1/2" to 0.5
    const rest = fractionMatch[2].trim();
    
    // Try to extract unit
    const unitMatch = rest.match(/^(cup|cups|tbsp|tsp|oz|lb|g|kg|ml|l|tablespoon|tablespoons|teaspoon|teaspoons|pound|pounds|ounce|ounces|gram|grams|kilogram|kilograms|liter|liters|milliliter|milliliters)\s+(.+)$/i);
    if (unitMatch) {
      return {
        original: ingredientStr,
        quantity,
        unit: unitMatch[1].toLowerCase(),
        ingredient: unitMatch[2].trim()
      };
    }
    
    // No unit, just quantity and ingredient
    return {
      original: ingredientStr,
      quantity,
      unit: '',
      ingredient: rest
    };
  }
  
  // No quantity found - return original text without forcing quantity
  return {
    original: ingredientStr,
    quantity: 0,
    unit: '',
    ingredient: ingredientStr
  };
}

function normalizeUnit(unit: string): string {
  const unitMap: Record<string, string> = {
    'cup': 'cup',
    'cups': 'cup',
    'tbsp': 'tbsp',
    'tablespoon': 'tbsp',
    'tablespoons': 'tbsp',
    'tsp': 'tsp',
    'teaspoon': 'tsp',
    'teaspoons': 'tsp',
    'oz': 'oz',
    'ounce': 'oz',
    'ounces': 'oz',
    'lb': 'lb',
    'pound': 'lb',
    'pounds': 'lb',
    'g': 'g',
    'gram': 'g',
    'grams': 'g',
    'kg': 'kg',
    'kilogram': 'kg',
    'kilograms': 'kg',
    'ml': 'ml',
    'milliliter': 'ml',
    'milliliters': 'ml',
    'l': 'l',
    'liter': 'l',
    'liters': 'l'
  };
  return unitMap[unit.toLowerCase()] || unit.toLowerCase();
}

function aggregateIngredients(recipes: Recipe[]): Map<string, ParsedIngredient[]> {
  const ingredientMap = new Map<string, ParsedIngredient[]>();
  
  recipes.forEach(recipe => {
    recipe.ingredients.forEach(ing => {
      const parsed = parseIngredient(ing);
      const key = parsed.ingredient.toLowerCase();
      
      if (!ingredientMap.has(key)) {
        ingredientMap.set(key, []);
      }
      ingredientMap.get(key)!.push(parsed);
    });
  });
  
  return ingredientMap;
}

function convertToShoppingQuantity(quantity: number, unit: string, ingredient: string): string {
  // Convert recipe measurements to realistic shopping amounts
  const normalizedUnit = normalizeUnit(unit);
  
  // Produce items - always use containers/bunches
  if (ingredient.includes('berries') || ingredient.includes('strawberries') || ingredient.includes('blueberries') || ingredient.includes('raspberries')) {
    return '1 container mixed berries';
  }
  if (ingredient.includes('lettuce') || ingredient.includes('spinach') || ingredient.includes('kale') || ingredient.includes('arugula')) {
    return '1 bag/bunch ' + ingredient;
  }
  if (ingredient.includes('onion') || ingredient.includes('garlic') || ingredient.includes('tomato')) {
    const roundedQty = Math.ceil(quantity);
    return `${roundedQty} ${ingredient}`;
  }
  
  // Liquid items - convert to common purchase sizes
  if (normalizedUnit === 'cup' || normalizedUnit === 'ml') {
    if (ingredient.includes('milk') || ingredient.includes('cream') || ingredient.includes('yogurt')) {
      if (quantity <= 1) return '1 small carton ' + ingredient;
      if (quantity <= 4) return '1 quart ' + ingredient;
      return '1 half gallon ' + ingredient;
    }
  }
  
  // Dry goods - use packages
  if (ingredient.includes('oats') || ingredient.includes('flour') || ingredient.includes('sugar') || ingredient.includes('rice')) {
    return '1 package ' + ingredient;
  }
  
  // Nuts and seeds - use bags
  if (ingredient.includes('almond') || ingredient.includes('nut') || ingredient.includes('seed')) {
    return '1 bag/container ' + ingredient;
  }
  
  // Eggs - round up
  if (ingredient.includes('egg')) {
    const eggCount = Math.ceil(quantity);
    if (eggCount <= 6) return '1 half dozen eggs';
    return '1 dozen eggs';
  }
  
  // Spices and seasonings - use original or "to taste"
  if (ingredient.includes('salt') || ingredient.includes('pepper') || ingredient.includes('spice') || 
      ingredient.includes('cinnamon') || ingredient.includes('vanilla')) {
    return ingredient + ' (to taste)';
  }
  
  // Default: round up small quantities and use package/container
  if (quantity > 0) {
    const roundedQty = Math.ceil(quantity);
    if (unit) {
      return `${roundedQty} ${normalizedUnit} ${ingredient} (or 1 package)`;
    } else {
      return `${roundedQty} ${ingredient}`;
    }
  }
  
  return ingredient;
}

function formatShoppingList(aggregated: Map<string, ParsedIngredient[]>): string[] {
  const items: string[] = [];
  
  aggregated.forEach((ingredients, key) => {
    // For shopping, we want to convert to realistic purchase amounts
    const firstIng = ingredients[0];
    
    // Sum up total quantity
    let totalQty = 0;
    let primaryUnit = '';
    
    ingredients.forEach(ing => {
      if (ing.quantity > 0) {
        totalQty += ing.quantity;
        if (!primaryUnit && ing.unit) {
          primaryUnit = ing.unit;
        }
      }
    });
    
    if (totalQty > 0) {
      // Convert to shopping quantity
      const shoppingItem = convertToShoppingQuantity(totalQty, primaryUnit, firstIng.ingredient);
      items.push(shoppingItem);
    } else {
      // No quantity - use as is
      items.push(firstIng.ingredient);
    }
  });
  
  return items.sort();
}

export function ShoppingListDialog({ isOpen, onClose, recipes }: ShoppingListDialogProps) {
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());
  
  const aggregated = aggregateIngredients(recipes);
  const shoppingList = formatShoppingList(aggregated);
  
  const toggleItem = (index: number) => {
    setCheckedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col" data-testid="dialog-shopping-list">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Shopping List
            <span className="text-sm font-normal text-muted-foreground">
              ({shoppingList.length - checkedItems.size} of {shoppingList.length} remaining)
            </span>
          </DialogTitle>
          <DialogDescription>
            Check off items as you add them to your cart
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto pr-2">
          <div className="space-y-2">
            {shoppingList.map((item, index) => (
              <div 
                key={index} 
                className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors cursor-pointer"
                onClick={() => toggleItem(index)}
                data-testid={`shopping-item-${index}`}
              >
                <Checkbox
                  checked={checkedItems.has(index)}
                  onCheckedChange={() => toggleItem(index)}
                  className="mt-0.5"
                  data-testid={`checkbox-item-${index}`}
                />
                <span 
                  className={`flex-1 ${checkedItems.has(index) ? 'line-through text-muted-foreground' : ''}`}
                >
                  {item}
                </span>
              </div>
            ))}
          </div>
          
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>From recipes:</strong>
            </p>
            <p className="text-sm mt-1">
              {recipes.map(r => r.name).join(', ')}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
