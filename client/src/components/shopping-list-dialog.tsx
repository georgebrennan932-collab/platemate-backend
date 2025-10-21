import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect, useMemo } from "react";
import { Plus, X, ShoppingBasket, Star } from "lucide-react";
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

// Helper to get emoji for ingredient
function getIngredientEmoji(item: string): string {
  const lower = item.toLowerCase();
  
  // Fruits & Berries
  if (lower.includes('berries') || lower.includes('strawberr') || lower.includes('blueberr')) return '🫐';
  if (lower.includes('apple')) return '🍎';
  if (lower.includes('banana')) return '🍌';
  if (lower.includes('orange')) return '🍊';
  if (lower.includes('lemon') || lower.includes('lime')) return '🍋';
  
  // Vegetables
  if (lower.includes('tomato')) return '🍅';
  if (lower.includes('lettuce') || lower.includes('salad')) return '🥗';
  if (lower.includes('carrot')) return '🥕';
  if (lower.includes('broccoli')) return '🥦';
  if (lower.includes('onion')) return '🧅';
  if (lower.includes('garlic')) return '🧄';
  if (lower.includes('pepper') && !lower.includes('black pepper')) return '🫑';
  if (lower.includes('potato')) return '🥔';
  if (lower.includes('spinach') || lower.includes('kale')) return '🥬';
  
  // Protein
  if (lower.includes('egg')) return '🥚';
  if (lower.includes('chicken') || lower.includes('poultry')) return '🍗';
  if (lower.includes('beef') || lower.includes('steak')) return '🥩';
  if (lower.includes('fish') || lower.includes('salmon')) return '🐟';
  if (lower.includes('shrimp') || lower.includes('prawn')) return '🍤';
  
  // Dairy
  if (lower.includes('milk')) return '🥛';
  if (lower.includes('cheese')) return '🧀';
  if (lower.includes('butter')) return '🧈';
  if (lower.includes('yogurt')) return '🥛';
  if (lower.includes('cream')) return '🥛';
  
  // Grains & Bread
  if (lower.includes('bread')) return '🍞';
  if (lower.includes('rice')) return '🍚';
  if (lower.includes('pasta')) return '🍝';
  if (lower.includes('oat')) return '🌾';
  if (lower.includes('flour')) return '🌾';
  
  // Nuts & Seeds
  if (lower.includes('almond') || lower.includes('nut')) return '🥜';
  if (lower.includes('seed')) return '🌰';
  
  // Seasonings
  if (lower.includes('salt')) return '🧂';
  if (lower.includes('pepper') && lower.includes('black')) return '🧂';
  if (lower.includes('cinnamon') || lower.includes('spice')) return '✨';
  if (lower.includes('vanilla')) return '✨';
  
  // Misc
  if (lower.includes('sugar') || lower.includes('honey')) return '🍯';
  if (lower.includes('oil') || lower.includes('olive')) return '🫒';
  if (lower.includes('sauce')) return '🥫';
  
  // Default
  return '🛒';
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
      <DialogContent className="max-w-md max-h-[85vh] overflow-hidden flex flex-col bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 dark:from-purple-950/30 dark:via-pink-950/30 dark:to-orange-950/30 border-0" data-testid="dialog-shopping-list">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <ShoppingBasket className="h-6 w-6 text-purple-600" />
            Shopping List
          </DialogTitle>
          <DialogDescription className="text-base">
            {remainingCount > 0 ? (
              <span className="text-purple-700 dark:text-purple-300 font-semibold">
                {remainingCount} of {totalItems} remaining
              </span>
            ) : totalItems > 0 ? (
              <span className="text-green-600 dark:text-green-400 font-semibold">
                🎉 All done! Great shopping!
              </span>
            ) : (
              <span>Add items to your list</span>
            )}
          </DialogDescription>
        </DialogHeader>
        
        {/* Add Custom Item Input */}
        <div className="flex gap-2 px-1">
          <Input
            placeholder="Add essential item (e.g., Milk, Bread)"
            value={newItemInput}
            onChange={(e) => setNewItemInput(e.target.value)}
            onKeyPress={handleKeyPress}
            className="bg-white dark:bg-gray-900 border-purple-200 dark:border-purple-800 focus-visible:ring-purple-500"
            data-testid="input-custom-item"
          />
          <Button 
            onClick={addCustomItem}
            size="icon"
            disabled={!newItemInput.trim()}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            data-testid="button-add-item"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex-1 overflow-y-auto pr-2 space-y-4">
          {/* Your Essentials Section */}
          {customItems.length > 0 && (
            <div>
              <div className="mb-3 p-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 flex items-center gap-2">
                <Star className="h-5 w-5 text-white" />
                <h3 className="text-base font-bold text-white">
                  Your Essentials
                </h3>
              </div>
              <div className="space-y-2">
                {customItems.map((item, index) => {
                  const isChecked = checkedItems.has(item.id);
                  return (
                    <div 
                      key={item.id} 
                      className="flex items-center gap-3 p-4 bg-white dark:bg-gray-900 rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer group"
                      onClick={() => toggleItem(item.id)}
                      data-testid={`custom-item-${index}`}
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => toggleItem(item.id)}
                        className="h-5 w-5 rounded-full border-2"
                        data-testid={`checkbox-custom-${index}`}
                      />
                      <span className="text-2xl">{getIngredientEmoji(item.label)}</span>
                      <span 
                        className={`flex-1 text-base ${isChecked ? 'line-through text-gray-400' : 'text-gray-900 dark:text-gray-100 font-medium'}`}
                      >
                        {item.label}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteCustomItem(item.id);
                        }}
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
              <div className="mb-3 p-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 flex items-center gap-2">
                <ShoppingBasket className="h-5 w-5 text-white" />
                <h3 className="text-base font-bold text-white">
                  From Recipes
                </h3>
              </div>
              <div className="space-y-2">
                {shoppingList.map((item, index) => {
                  // Use item content as stable ID to survive recipe changes
                  const itemId = `recipe-${item.toLowerCase().replace(/\s+/g, '-')}`;
                  const isChecked = checkedItems.has(itemId);
                  return (
                    <div 
                      key={itemId} 
                      className="flex items-center gap-3 p-4 bg-white dark:bg-gray-900 rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer"
                      onClick={() => toggleItem(itemId)}
                      data-testid={`shopping-item-${index}`}
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => toggleItem(itemId)}
                        className="h-5 w-5 rounded-full border-2"
                        data-testid={`checkbox-item-${index}`}
                      />
                      <span className="text-2xl">{getIngredientEmoji(item)}</span>
                      <span 
                        className={`flex-1 text-base ${isChecked ? 'line-through text-gray-400' : 'text-gray-900 dark:text-gray-100 font-medium'}`}
                      >
                        {item}
                      </span>
                    </div>
                  );
                })}
              </div>
              
              {recipes.length > 0 && (
                <div className="mt-4 p-4 bg-white/60 dark:bg-gray-900/60 rounded-xl backdrop-blur-sm">
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                    From your recipes:
                  </p>
                  <p className="text-sm mt-1 text-gray-800 dark:text-gray-200">
                    {recipes.map(r => r.name).join(', ')}
                  </p>
                </div>
              )}
            </div>
          )}
          
          {/* Empty State */}
          {shoppingList.length === 0 && customItems.length === 0 && (
            <div className="text-center py-12">
              <ShoppingBasket className="h-16 w-16 mx-auto mb-4 text-purple-300 dark:text-purple-700" />
              <p className="text-base text-gray-600 dark:text-gray-400 font-medium">
                Add custom items or select recipes
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                to build your shopping list
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
