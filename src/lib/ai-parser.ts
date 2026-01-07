
/**
 * Simulated AI Parser for Shopping List (Gemini 3 Pro Placeholder)
 * 
 * In a production environment with the API Key, this would call:
 * const model = genAI.getGenerativeModel({ model: "gemini-pro" });
 * const result = await model.generateContent(\`Extract shopping items from: "\${text}" JSON format: { items: [{ name, category }] }\`);
 */

type ParsedItem = {
    name: string
    category: string
    quantity?: string
}

type Recipe = {
    name: string
    ingredients: (n: number) => ParsedItem[]
}

const RECIPE_BOOK: Record<string, Recipe> = {
    "gratin dauphinois": {
        name: "Gratin Dauphinois",
        ingredients: (n) => [
            { name: "Pommes de terre", category: "Fruits & Légumes", quantity: `${n * 250}g` },
            { name: "Crème liquide", category: "Crémerie", quantity: `${n * 12.5}cl` },
            { name: "Lait", category: "Crémerie", quantity: `${n * 12.5}cl` },
            { name: "Ail", category: "Divers", quantity: "1 gousse" },
            { name: "Beurre", category: "Crémerie", quantity: "20g" }
        ]
    },
    "pâtes carbonara": {
        name: "Pâtes Carbonara",
        ingredients: (n) => [
            { name: "Pâtes", category: "Épicerie", quantity: `${n * 100}g` },
            { name: "Lardons", category: "Boucherie", quantity: `${n * 50}g` },
            { name: "Oeufs", category: "Crémerie", quantity: `${Math.ceil(n * 1.5)}` },
            { name: "Parmesan", category: "Crémerie", quantity: `${n * 20}g` }
        ]
    }
}

export async function parseShoppingListAI(text: string): Promise<{ items: ParsedItem[], recipe?: string }> {
    // Simulate AI Latency
    await new Promise(resolve => setTimeout(resolve, 800));

    const lower = text.toLowerCase();

    // Check for recipes first
    for (const [key, recipe] of Object.entries(RECIPE_BOOK)) {
        if (lower.includes(key)) {
            return { items: [], recipe: recipe.name };
        }
    }

    const items: ParsedItem[] = [];

    // Rule-based "AI" for demonstration
    const categoryMap: Record<string, string> = {
        'lait': 'Frais',
        'oeufs': 'Frais',
        'oeuf': 'Frais',
        'beurre': 'Frais',
        'yaourt': 'Frais',
        'fromage': 'Frais',
        'pain': 'Boulangerie',
        'croissant': 'Boulangerie',
        'baguette': 'Boulangerie',
        'pomme': 'Fruits & Légumes',
        'banane': 'Fruits & Légumes',
        'tomate': 'Fruits & Légumes',
        'salade': 'Fruits & Légumes',
        'pâte': 'Épicerie',
        'riz': 'Épicerie',
        'café': 'Épicerie',
        'sucre': 'Épicerie',
        'savon': 'Hygiène',
        'shampoing': 'Hygiène',
        'dentifrice': 'Hygiène',
        'piles': 'Entretien',
        'lessive': 'Entretien',
        'liquide vaisselle': 'Entretien',
    };

    // Split by common separators
    const parts = lower.replace('et', ',').replace('puis', ',').split(/,|\./);

    parts.forEach(p => {
        const trimmed = p.trim();
        if (!trimmed) return;

        // Detect quantity (e.g., "12 oeufs", "2kg de pommes")
        const qtyMatch = trimmed.match(/^(\d+(?:\s*(?:kg|g|l))?)\s+(.+)$/);
        let name = qtyMatch ? qtyMatch[2] : trimmed;
        let quantity = qtyMatch ? qtyMatch[1] : '';

        // Detect "pour Lou", "pour Papa", etc.
        const memberMatch = name.match(/(.+)\s+pour\s+(\w+)/i);
        if (memberMatch) {
            name = `${memberMatch[1]} (Pour ${memberMatch[2]})`;
        }

        // Detect category
        let category = 'Divers';
        for (const [key, cat] of Object.entries(categoryMap)) {
            if (name.toLowerCase().includes(key)) {
                category = cat;
                break;
            }
        }

        items.push({ name, category, quantity });
    });

    if (items.length === 0 && text.trim().length > 0) {
        items.push({ name: text, category: "Divers" })
    }

    return { items };
}

export function getRecipeIngredients(recipeName: string, persons: number): ParsedItem[] {
    const key = recipeName.toLowerCase();
    return RECIPE_BOOK[key]?.ingredients(persons) || [];
}
