
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

export async function parseShoppingListAI(text: string): Promise<ParsedItem[]> {
    // Simulate AI Latency
    await new Promise(resolve => setTimeout(resolve, 800));

    const lower = text.toLowerCase();
    const items: ParsedItem[] = [];

    // Rule-based "AI" for demonstration of the requested user story
    // "Prendre du lait et 12 oeufs pour demain"

    if (lower.includes("lait")) {
        items.push({ name: "Lait", category: "Crémerie", quantity: "1L" })
    }

    if (lower.includes("oeuf") || lower.includes("œufs")) {
        // Extract quantity if present
        const match = lower.match(/(\d+)\s*oeuf/);
        const qty = match ? match[1] : "12";
        items.push({ name: "Oeufs", category: "Crémerie", quantity: qty })
    }

    if (lower.includes("pain")) {
        items.push({ name: "Pain", category: "Boulangerie" })
    }

    if (lower.includes("carotte")) {
        items.push({ name: "Carottes", category: "Fruits & Légumes" })
    }

    if (lower.includes("pâtes") || lower.includes("spaghetti")) {
        items.push({ name: "Pâtes", category: "Épicerie" })
    }

    // Default fallback if nothing detected but text exists (assume generic item)
    if (items.length === 0 && text.trim().length > 0) {
        items.push({ name: text, category: "Divers" })
    }

    return items;
}
