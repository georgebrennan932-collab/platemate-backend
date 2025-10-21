import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect, useMemo } from "react";
import { Plus, X } from "lucide-react";
import { nanoid } from "nanoid";

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

interface CustomItem {
  id: string;
  label: string;
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
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [customItems, setCustomItems] = useState<CustomItem[]>([]);
  const [newItemInput, setNewItemInput] = useState("");
  
  // Load custom items from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('shopping-list-custom-items');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Migrate old string array format to new object format
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (typeof parsed[0] === 'string') {
            // Old format: convert to new format
            const migrated = parsed.map(label => ({ id: nanoid(), label }));
            setCustomItems(migrated);
          } else {
            // New format: use as is
            setCustomItems(parsed);
          }
        }
      } catch (e) {
        console.error('Failed to load custom items:', e);
      }
    }
  }, []);
  
  // Save custom items to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('shopping-list-custom-items', JSON.stringify(customItems));
  }, [customItems]);
  
  // Calculate shopping list from recipes
  const shoppingList = useMemo(() => {
    const aggregated = aggregateIngredients(recipes);
    return formatShoppingList(aggregated);
  }, [recipes]);
  
  // Clean up checked items when recipe list or custom items change
  useEffect(() => {
    setCheckedItems(prev => {
      const newSet = new Set(prev);
      const validIds = new Set([
        ...customItems.map(item => item.id),
        ...shoppingList.map(item => `recipe-${item.toLowerCase().replace(/\s+/g, '-')}`)
      ]);
      // Remove any checked IDs that no longer exist
      prev.forEach(id => {
        if (!validIds.has(id)) {
          newSet.delete(id);
        }
      });
      return newSet;
    });
  }, [customItems, shoppingList]);
  
  const toggleItem = (itemId: string) => {
    setCheckedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };
  
  const addCustomItem = () => {
    const trimmed = newItemInput.trim();
    if (trimmed) {
      const newItem: CustomItem = {
        id: nanoid(),
        label: trimmed
      };
      setCustomItems(prev => [...prev, newItem]);
      setNewItemInput("");
    }
  };
  
  const deleteCustomItem = (itemId: string) => {
    setCustomItems(prev => prev.filter(item => item.id !== itemId));
    // Also uncheck if it was checked
    setCheckedItems(prev => {
      const newSet = new Set(prev);
      newSet.delete(itemId);
      return newSet;
    });
  };
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addCustomItem();
    }
  };
  
  const totalItems = shoppingList.length + customItems.length;
  const checkedCount = checkedItems.size;
  const remainingCount = totalItems - checkedCount;
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col" data-testid="dialog-shopping-list">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Shopping List
            <span className="text-sm font-normal text-muted-foreground">
              ({remainingCount} of {totalItems} remaining)
            </span>
          </DialogTitle>
          <DialogDescription>
            Check off items as you add them to your cart
          </DialogDescription>
        </DialogHeader>
        
        {/* Add Custom Item Input */}
        <div className="flex gap-2 px-1">
          <Input
            placeholder="Add essential item (e.g., Milk, Bread)"
            value={newItemInput}
            onChange={(e) => setNewItemInput(e.target.value)}
            onKeyPress={handleKeyPress}
            data-testid="input-custom-item"
          />
          <Button 
            onClick={addCustomItem}
            size="icon"
            disabled={!newItemInput.trim()}
            data-testid="button-add-item"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex-1 overflow-y-auto pr-2">
          {/* Your Essentials Section */}
          {customItems.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold mb-2 px-1 text-primary">
                Your Essentials
              </h3>
              <div className="space-y-2">
                {customItems.map((item, index) => {
                  return (
                    <div 
                      key={item.id} 
                      className="flex items-start gap-2 p-3 bg-primary/5 rounded-lg hover:bg-primary/10 transition-colors"
                      data-testid={`custom-item-${index}`}
                    >
                      <Checkbox
                        checked={checkedItems.has(item.id)}
                        onCheckedChange={() => toggleItem(item.id)}
                        className="mt-0.5"
                        data-testid={`checkbox-custom-${index}`}
                      />
                      <span 
                        className={`flex-1 cursor-pointer ${checkedItems.has(item.id) ? 'line-through text-muted-foreground' : ''}`}
                        onClick={() => toggleItem(item.id)}
                      >
                        {item.label}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteCustomItem(item.id)}
                        data-testid={`button-delete-custom-${index}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* From Recipes Section */}
          {shoppingList.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2 px-1 text-muted-foreground">
                From Recipes
              </h3>
              <div className="space-y-2">
                {shoppingList.map((item, index) => {
                  // Use item content as stable ID to survive recipe changes
                  const itemId = `recipe-${item.toLowerCase().replace(/\s+/g, '-')}`;
                  return (
                    <div 
                      key={itemId} 
                      className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors cursor-pointer"
                      onClick={() => toggleItem(itemId)}
                      data-testid={`shopping-item-${index}`}
                    >
                      <Checkbox
                        checked={checkedItems.has(itemId)}
                        onCheckedChange={() => toggleItem(itemId)}
                        className="mt-0.5"
                        data-testid={`checkbox-item-${index}`}
                      />
                      <span 
                        className={`flex-1 ${checkedItems.has(itemId) ? 'line-through text-muted-foreground' : ''}`}
                      >
                        {item}
                      </span>
                    </div>
                  );
                })}
              </div>
              
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Recipes:</strong>
                </p>
                <p className="text-sm mt-1">
                  {recipes.map(r => r.name).join(', ')}
                </p>
              </div>
            </div>
          )}
          
          {/* Empty State */}
          {shoppingList.length === 0 && customItems.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">Add custom items or select recipes to build your shopping list</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
