import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Printer, Check } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

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

function formatShoppingList(aggregated: Map<string, ParsedIngredient[]>): string[] {
  const items: string[] = [];
  
  aggregated.forEach((ingredients, key) => {
    // Group by unit
    const byUnit = new Map<string, number>();
    const noQuantity: string[] = [];
    
    ingredients.forEach(ing => {
      if (ing.quantity > 0 && ing.unit) {
        const normalizedUnit = normalizeUnit(ing.unit);
        const current = byUnit.get(normalizedUnit) || 0;
        byUnit.set(normalizedUnit, current + ing.quantity);
      } else if (ing.quantity > 0 && !ing.unit) {
        const current = byUnit.get('') || 0;
        byUnit.set('', current + ing.quantity);
      } else {
        // No quantity found - use original text
        noQuantity.push(ing.original);
      }
    });
    
    // Format the aggregated quantities
    if (byUnit.size > 0) {
      const parts: string[] = [];
      byUnit.forEach((qty, unit) => {
        if (unit) {
          // Format quantity nicely (remove unnecessary decimals)
          const formattedQty = qty % 1 === 0 ? qty : qty.toFixed(2);
          parts.push(`${formattedQty} ${unit}`);
        } else {
          // For unitless items, always show the quantity (even if it's 1)
          const formattedQty = qty % 1 === 0 ? qty : qty.toFixed(2);
          parts.push(`${formattedQty}`);
        }
      });
      
      const quantityStr = parts.filter(p => p).join(' + ');
      items.push(`${quantityStr} ${ingredients[0].ingredient}`.trim());
    } else if (noQuantity.length > 0) {
      // Use the original text as-is for descriptive ingredients
      items.push(noQuantity[0]);
    }
  });
  
  return items.sort();
}

export function ShoppingListDialog({ isOpen, onClose, recipes }: ShoppingListDialogProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  
  const aggregated = aggregateIngredients(recipes);
  const shoppingList = formatShoppingList(aggregated);
  
  const handleCopy = async () => {
    const text = `Shopping List\n\n${shoppingList.map((item, i) => `${i + 1}. ${item}`).join('\n')}\n\nFrom recipes: ${recipes.map(r => r.name).join(', ')}`;
    
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Shopping list copied to clipboard.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Unable to copy to clipboard.",
        variant: "destructive",
      });
    }
  };
  
  const handlePrint = () => {
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Shopping List</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #333; }
            ul { line-height: 1.8; }
            .recipes { margin-top: 20px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <h1>Shopping List</h1>
          <ul>
            ${shoppingList.map(item => `<li>${item}</li>`).join('')}
          </ul>
          <div class="recipes">
            <strong>From recipes:</strong> ${recipes.map(r => r.name).join(', ')}
          </div>
        </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col" data-testid="dialog-shopping-list">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Shopping List
            <span className="text-sm font-normal text-muted-foreground">({shoppingList.length} items)</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto pr-2">
          <div className="space-y-2">
            {shoppingList.map((item, index) => (
              <div 
                key={index} 
                className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"
                data-testid={`shopping-item-${index}`}
              >
                <span className="text-muted-foreground font-medium min-w-[24px]">{index + 1}.</span>
                <span className="flex-1">{item}</span>
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
        
        <DialogFooter className="gap-2 mt-4">
          <Button 
            onClick={handleCopy} 
            variant="outline"
            className="flex-1"
            data-testid="button-copy-shopping-list"
          >
            {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
            {copied ? 'Copied!' : 'Copy'}
          </Button>
          <Button 
            onClick={handlePrint}
            variant="outline"
            className="flex-1"
            data-testid="button-print-shopping-list"
          >
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
