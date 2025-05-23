import React, { useState, useEffect } from "react";
import { db } from "../firebase"; 
import { collection, getDocs } from "firebase/firestore";
import { 
  Clock, 
  Users, 
  Flame, 
  ChefHat, 
  Scale, 
  Utensils,
  Pizza,
  Minus,
  Plus
} from "lucide-react";

// Sample recipe data
const sampleRecipes = [
  {
    id: "1",
    recipe_name: "Classic Chocolate Chip Cookies",
    description: "Soft and chewy cookies with melty chocolate chips, perfect for dessert or a sweet snack.",
    category: "Dessert",
    preparation_time: 15,
    cooking_time: 10,
    servings: 24,
    calories: 150,
    difficulty: "Easy",
    ingredients: "225g butter, 1 cup white sugar, 1 cup brown sugar, 2 eggs, 2 tsp vanilla extract, 3 cups all-purpose flour, 1 tsp baking soda, 2 tsp hot water, 0.5 tsp salt, 2 cups semisweet chocolate chips",
    instructions: "Preheat oven to 350°F (175°C). Cream butter and sugars until smooth. Beat in eggs one at a time, then stir in vanilla. Dissolve baking soda in hot water and add to mixture with salt. Stir in flour and chocolate chips. Drop by large spoonfuls onto ungreased baking sheets. Bake for about 10 minutes until edges are golden."
  },
  {
    id: "2",
    recipe_name: "Creamy Garlic Pasta",
    description: "Rich and creamy pasta dish with garlic-infused sauce that comes together in just 20 minutes.",
    category: "Main Course",
    preparation_time: 5,
    cooking_time: 15,
    servings: 4,
    calories: 450,
    difficulty: "Easy",
    ingredients: "8 oz fettuccine pasta, 2 tbsp olive oil, 4 cloves garlic, 1 cup heavy cream, 0.5 cup grated parmesan cheese, 2 tbsp butter, 0.25 tsp salt, 0.25 tsp black pepper, 2 tbsp fresh parsley",
    instructions: "Cook pasta according to package directions. In a large skillet, heat olive oil over medium heat. Add minced garlic and sauté for 1-2 minutes until fragrant. Pour in heavy cream and bring to a simmer. Add parmesan cheese and butter, stirring until melted and sauce is smooth. Season with salt and pepper. Drain pasta and add to the sauce, tossing to coat. Garnish with chopped parsley before serving."
  },
  {
    id: "3",
    recipe_name: "Fresh Garden Salad",
    description: "A refreshing mix of garden vegetables with a zesty homemade vinaigrette.",
    category: "Salad",
    preparation_time: 15,
    cooking_time: 0,
    servings: 4,
    calories: 120,
    difficulty: "Easy",
    ingredients: "6 cups mixed greens, 1 cucumber, 2 tomatoes, 1 red onion, 1 bell pepper, 2 carrots, 0.5 cup olive oil, 3 tbsp red wine vinegar, 1 tsp dijon mustard, 1 garlic clove, 1 tsp honey, 0.5 tsp salt, 0.25 tsp black pepper",
    instructions: "Wash and dry all vegetables. Chop mixed greens if needed and place in a large salad bowl. Slice cucumber, dice tomatoes, thinly slice red onion, julienne bell pepper, and grate carrots. Add all vegetables to the greens. In a small jar, combine olive oil, red wine vinegar, dijon mustard, minced garlic, honey, salt and pepper. Shake well to emulsify. Drizzle dressing over salad just before serving and toss to coat."
  }
];

// Nutritional Icon Component
const NutritionIcon = ({ icon: Icon, value, label, color }) => (
  <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-2">
    <Icon className={color} size={20} />
    <div>
      <p className="text-xs text-gray-600">{label}</p>
      <p className="font-semibold text-gray-800">{value}</p>
    </div>
  </div>
);

// Recipe Modal Component
const RecipeModal = ({ recipe, onClose }) => {
  // Add a state for the quantity multiplier
  const [multiplier, setMultiplier] = useState(1);
  // Add a state for the current servings
  const [currentServings, setCurrentServings] = useState(recipe.servings);

  if (!recipe) return null;

  // Function to handle increasing servings/multiplier
  const increaseServings = () => {
    const newMultiplier = multiplier + 0.25;
    setMultiplier(newMultiplier);
    setCurrentServings(Math.round(recipe.servings * newMultiplier));
  };

  // Function to handle decreasing servings/multiplier
  const decreaseServings = () => {
    if (multiplier > 0.25) {
      const newMultiplier = multiplier - 0.25;
      setMultiplier(newMultiplier);
      setCurrentServings(Math.round(recipe.servings * newMultiplier));
    }
  };

  // Safe parsing of ingredients with dual unit conversion and quantity multiplication
  const parseIngredients = (ingredients) => {
    // Handle different input types
    if (typeof ingredients !== 'string') {
      // If it's an array or not a string, convert to string or return empty array
      ingredients = Array.isArray(ingredients) 
        ? ingredients.join(', ') 
        : String(ingredients || '');
    }

    return ingredients.split(',').map(ingredient => {
      // Trim and remove any extra whitespace
      const cleanedIngredient = ingredient.trim();
      
      // Attempt to separate quantity and ingredient name
      const match = cleanedIngredient.match(/^(\d+(?:\.\d+)?)\s*(\w+)?\s*(.+)?/);
      
      let quantity = match ? match[1] || '' : '';
      let unit = match ? match[2] || '' : '';
      let name = match ? match[3] || cleanedIngredient : cleanedIngredient;
      
      // Apply the multiplier to the quantity if it exists
      let adjustedQuantity = '';
      if (quantity) {
        const numericQuantity = parseFloat(quantity);
        if (!isNaN(numericQuantity)) {
          adjustedQuantity = (numericQuantity * multiplier).toFixed(
            // If the original was an integer, keep 0 decimals for small numbers or up to 1 for larger
            Number.isInteger(numericQuantity) && numericQuantity * multiplier < 10 
              ? 0 
              : 1
          );
          // Remove trailing .0 if present
          adjustedQuantity = adjustedQuantity.replace(/\.0$/, '');
        } else {
          adjustedQuantity = quantity; // Keep original if not a number
        }
      }
      
      // Convert measurements to dual units (gram and tablespoon)
      let gramValue = '';
      let tbspValue = '';
      
      if (adjustedQuantity && unit) {
        // Simple conversions (these are approximates and would need to be refined)
        if (unit.toLowerCase() === 'g' || unit.toLowerCase() === 'gram' || unit.toLowerCase() === 'grams') {
          gramValue = adjustedQuantity;
          tbspValue = (parseFloat(adjustedQuantity) / 15).toFixed(1); // Approx 15g = 1 tbsp
        } else if (unit.toLowerCase() === 'tbsp' || unit.toLowerCase() === 'tablespoon' || unit.toLowerCase() === 'tablespoons') {
          tbspValue = adjustedQuantity;
          gramValue = (parseFloat(adjustedQuantity) * 15).toFixed(0); // Approx 1 tbsp = 15g
        } else if (unit.toLowerCase() === 'tsp' || unit.toLowerCase() === 'teaspoon' || unit.toLowerCase() === 'teaspoons') {
          tbspValue = (parseFloat(adjustedQuantity) / 3).toFixed(1); // 3 tsp = 1 tbsp
          gramValue = (parseFloat(adjustedQuantity) * 5).toFixed(0); // Approx 1 tsp = 5g
        } else if (unit.toLowerCase() === 'cup' || unit.toLowerCase() === 'cups') {
          tbspValue = (parseFloat(adjustedQuantity) * 16).toFixed(1); // 1 cup = 16 tbsp
          gramValue = (parseFloat(adjustedQuantity) * 240).toFixed(0); // Approx 1 cup = 240g
        } else if (unit.toLowerCase() === 'oz' || unit.toLowerCase() === 'ounce' || unit.toLowerCase() === 'ounces') {
          gramValue = (parseFloat(adjustedQuantity) * 28.35).toFixed(0); // 1 oz = 28.35g
          tbspValue = (parseFloat(adjustedQuantity) * 2).toFixed(1); // Approx 1 oz = 2 tbsp
        }
        // Add more conversions as needed
      }
      
      return { 
        originalQuantity: quantity,
        quantity: adjustedQuantity,
        unit,
        name,
        gramValue,
        tbspValue
      };
    });
  };

  // Safe parsing of instructions
  const parseInstructions = (instructions) => {
    // Handle different input types
    if (typeof instructions !== 'string') {
      // If it's an array or not a string, convert to string or return empty array
      instructions = Array.isArray(instructions) 
        ? instructions.join('. ') 
        : String(instructions || '');
    }

    return instructions
      .split(/[.!]/)  // Split on periods or exclamation marks
      .filter(step => step.trim())  // Remove empty steps
      .map(step => step.trim());
  };

  const parsedIngredients = parseIngredients(recipe.ingredients);
  const parsedInstructions = parseInstructions(recipe.instructions);

  // Calculate adjusted calories based on the multiplier
  const adjustedCalories = Math.round(recipe.calories * multiplier);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[95vh] overflow-y-auto relative shadow-2xl">
        {/* Close Button */}
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 z-10 text-gray-600 hover:text-gray-900 bg-gray-100 rounded-full p-2"
        >
          ✕
        </button>

        {/* Recipe Header */}
        <div className="relative">
          <img 
            src={recipe.image || `https://source.unsplash.com/800x400/?${recipe.recipe_name}`}
            alt={recipe.recipe_name}
            className="w-full h-64 md:h-96 object-cover rounded-t-2xl"
          />
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-6">
            <h1 className="text-3xl font-bold text-white">{recipe.recipe_name}</h1>
          </div>
        </div>

        {/* Recipe Overview */}
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <NutritionIcon 
              icon={Clock} 
              value={`${recipe.preparation_time + recipe.cooking_time} min`} 
              label="Total Time"
              color="text-amber-500"
            />
            <NutritionIcon 
              icon={Flame} 
              value={`${adjustedCalories} Cal`} 
              label="Calories"
              color="text-red-500"
            />
            
            {/* Servings with adjustment controls */}
            <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-2">
              <Users className="text-green-500" size={20} />
              <div className="flex-1">
                <p className="text-xs text-gray-600">Servings</p>
                <div className="flex items-center justify-between">
                  <button 
                    onClick={decreaseServings} 
                    className="bg-amber-100 hover:bg-amber-200 text-amber-700 w-6 h-6 rounded-full flex items-center justify-center"
                    disabled={multiplier <= 0.25}
                  >
                    <Minus size={14} />
                  </button>
                  <p className="font-semibold text-gray-800 mx-2">{currentServings}</p>
                  <button 
                    onClick={increaseServings} 
                    className="bg-amber-100 hover:bg-amber-200 text-amber-700 w-6 h-6 rounded-full flex items-center justify-center"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>
            
            <NutritionIcon 
              icon={ChefHat} 
              value={recipe.difficulty} 
              label="Difficulty"
              color="text-purple-500"
            />
          </div>

          {/* Description */}
          <p className="text-gray-600 mb-6">{recipe.description || 'No description available'}</p>

          {/* Ingredients Section */}
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center">
              <Scale className="mr-3 text-gray-500" size={24} />
              Ingredients
              {multiplier !== 1 && (
                <span className="ml-3 text-sm font-normal text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                  {multiplier}x
                </span>
              )}
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {parsedIngredients.map((ingredient, index) => (
                <div 
                  key={index} 
                  className="bg-gray-50 rounded-lg p-3 flex items-start"
                >
                  {ingredient.quantity && (
                    <div className="font-bold text-gray-700 mr-2 min-w-[90px]">
                      <div>{ingredient.quantity} {ingredient.unit}</div>
                      {(ingredient.gramValue || ingredient.tbspValue) && (
                        <div className="text-xs text-gray-500 font-normal mt-1">
                          {ingredient.gramValue && `${ingredient.gramValue}g`}
                          {ingredient.gramValue && ingredient.tbspValue && " / "}
                          {ingredient.tbspValue && `${ingredient.tbspValue} tbsp`}
                        </div>
                      )}
                    </div>
                  )}
                  <span className="text-gray-600">{ingredient.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Instructions Section */}
          <div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center">
              <Utensils className="mr-3 text-gray-500" size={24} />
              Step-by-Step Instructions
            </h2>
            <ol className="space-y-4">
              {parsedInstructions.map((step, index) => (
                <li 
                  key={index} 
                  className="bg-gray-50 rounded-lg p-4 flex items-start"
                >
                  <span className="text-white bg-amber-500 rounded-full w-8 h-8 flex items-center justify-center font-bold mr-4 flex-shrink-0">
                    {index + 1}
                  </span>
                  <span className="text-gray-700">{step}.</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Additional Details */}
          <div className="mt-8 border-t pt-6 grid md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold text-gray-800 mb-2 flex items-center">
                <Pizza className="mr-2 text-gray-500" size={20} />
                Category
              </h3>
              <p className="text-gray-600">{recipe.category || 'Uncategorized'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const RecipeSection = () => {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [filter, setFilter] = useState('All');
  const [useSampleData, setUseSampleData] = useState(true); // For demo purposes

  useEffect(() => {
    const fetchRecipes = async () => {
      try {
        // Use sample data if flag is set (for demo purposes)
        if (useSampleData) {
          setRecipes(sampleRecipes);
          setLoading(false);
          return;
        }
        
        // Otherwise fetch from Firebase
        const querySnapshot = await getDocs(collection(db, "recipes"));
        const recipeData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setRecipes(recipeData);
      } catch (error) {
        console.error("Error fetching recipes:", error);
        // Fallback to sample data if Firebase fetch fails
        setRecipes(sampleRecipes);
      } finally {
        setLoading(false);
      }
    };

    fetchRecipes();
  }, [useSampleData]);

  // Get unique categories
  const categories = ['All', ...new Set(recipes.map(recipe => recipe.category || 'Uncategorized'))];

  // Filter recipes based on category
  const filteredRecipes = filter === 'All' 
    ? recipes 
    : recipes.filter(recipe => (recipe.category || 'Uncategorized') === filter);

  return (
    <section className="bg-gradient-to-br from-[#FFF5E1] to-[#FFE4B5] py-16">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-4xl font-bold text-gray-800 mb-4">
            Explore Our Recipes
          </h2>
          <p className="text-gray-600 text-lg">
            Discover delicious recipes from various categories
          </p>
          
          {/* Toggle between sample and Firebase data (for demonstration) */}
          <div className="mt-4">
            <button 
              onClick={() => setUseSampleData(!useSampleData)}
              className="bg-amber-500 text-white px-4 py-2 rounded-lg hover:bg-amber-600 transition-colors"
            >
              {useSampleData ? "Use Firebase Data" : "Use Sample Data"}
            </button>
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex justify-center mb-8 flex-wrap gap-4">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setFilter(category)}
              className={`px-4 py-2 rounded-full transition-all duration-300 ${
                filter === category 
                  ? 'bg-orange-500 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-orange-100'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-center text-gray-600">Loading recipes...</p>
        ) : filteredRecipes.length === 0 ? (
          <p className="text-center text-gray-600">No recipes available.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRecipes.map((recipe) => (
              <div 
                key={recipe.id} 
                className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 text-center transition-all duration-300 hover:shadow-xl hover:scale-105 cursor-pointer"
                onClick={() => setSelectedRecipe(recipe)}
              >
                <div className="relative mb-6">
                  <img
                    src={
                      recipe.image ||
                      `https://source.unsplash.com/400x300/?${recipe.recipe_name}`
                    }
                    alt={recipe.recipe_name}
                    className="rounded-lg w-full h-48 object-cover"
                  />
                  <div className="absolute top-3 right-3 bg-black/60 text-white px-2 py-1 rounded-full text-xs font-medium">
                    {recipe.difficulty || "Unknown"}
                  </div>
                </div>

                <h3 className="text-xl font-semibold text-gray-800 mb-3">
                  {recipe.recipe_name}
                </h3>
                <div className="flex justify-center gap-4 text-gray-500 text-sm mb-4">
                  <span className="flex items-center">
                    <Clock className="mr-1" size={16} />
                    {recipe.preparation_time + recipe.cooking_time} min
                  </span>
                  <span className="flex items-center">
                    <Flame className="mr-1" size={16} />
                    {recipe.calories} Cal
                  </span>
                </div>
                <p className="text-gray-600 text-sm mb-4">
                  {recipe.description || "A delicious recipe to try!"}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recipe Details Modal */}
      {selectedRecipe && (
        <RecipeModal 
          recipe={selectedRecipe} 
          onClose={() => setSelectedRecipe(null)} 
        />
      )}
    </section>
  );
};

export default RecipeSection;