import type { MealItem } from '../../types/meal';
import type {
  NutritionRecommendationsResult,
  NutritionAspect,
  Footnote,
} from '../../types/nutrition';

interface MacroTotals {
  carbs_kcal: number;
  protein_kcal: number;
  fat_kcal: number;
  fiber_g: number;
  sodium_mg: number;
  sugar_g: number;
  macroKcalSum: number;
}

export function getNutritionRecommendations({
  mealItems,
  macroTotals,
  totalDietaryEnergyKcal,
}: {
  mealItems: MealItem[] | undefined | null;
  macroTotals: MacroTotals;
  totalDietaryEnergyKcal: number;
}): NutritionRecommendationsResult {
  const amdr = {
    carbs: { min: 45, max: 65 },
    protein: { min: 10, max: 35 },
    fat: { min: 20, max: 35 },
  };

  const macroKcalSum = Math.max(
    1,
    macroTotals?.macroKcalSum ?? 0,
    totalDietaryEnergyKcal
  );
  const macroPct = {
    carbsPct: Math.round(((macroTotals?.carbs_kcal ?? 0) / macroKcalSum) * 100),
    proteinPct: Math.round(
      ((macroTotals?.protein_kcal ?? 0) / macroKcalSum) * 100
    ),
    fatPct: Math.round(((macroTotals?.fat_kcal ?? 0) / macroKcalSum) * 100),
  };

  const evaluateRange = (pct: number, min: number, max: number) => {
    if (pct < min) return 'low' as const;
    if (pct > max) return 'high' as const;
    return 'ok' as const;
  };

  const carbsStatus = evaluateRange(
    macroPct.carbsPct,
    amdr.carbs.min,
    amdr.carbs.max
  );
  const proteinStatus = evaluateRange(
    macroPct.proteinPct,
    amdr.protein.min,
    amdr.protein.max
  );
  const fatStatus = evaluateRange(macroPct.fatPct, amdr.fat.min, amdr.fat.max);

  const makeAspect = (
    id: string,
    title: string,
    status: 'low' | 'ok' | 'high',
    short: string,
    detail: string,
    tips: string[]
  ): NutritionAspect => ({
    id,
    title,
    status,
    tone:
      status === 'ok' ? 'success' : status === 'low' ? 'warning' : 'warning',
    short,
    detail,
    tips,
  });

  const aspects: NutritionAspect[] = [];

  // Energy aspect
  if (!mealItems || mealItems.length === 0) {
    aspects.push(
      makeAspect(
        'energy',
        'Energy',
        'ok',
        'No meals logged — add foods for personalised guidance.',
        "We don't have any logged foods for today. Log meals to receive tailored recommendations.",
        [
          'Add a breakfast: eggs + wholegrain toast',
          'Snack: yogurt + fruit',
          'Include a small handful of nuts',
        ]
      )
    );
  } else {
    let status: 'low' | 'ok' | 'high' = 'ok';
    let short = 'Energy within common range.';
    let detail = 'Your total energy intake is within a typical adult range.';
    if (totalDietaryEnergyKcal < 1200) {
      status = 'low';
      short = 'Energy appears low today.';
      detail =
        'Calorie intake is lower than typical adult needs; consider adding nutrient-dense snacks or slightly larger portions.';
    } else if (totalDietaryEnergyKcal < 1600) {
      status = 'low';
      short = 'Intake below common adult ranges.';
      detail =
        'You are below the average adult energy range; add balanced energy-dense foods if needed.';
    } else if (totalDietaryEnergyKcal >= 2200) {
      status = 'high';
      short = 'Energy is relatively high.';
      detail =
        'Energy intake is higher than typical ranges — watch portion sizes and energy-dense foods.';
    }

    aspects.push(
      makeAspect('energy', 'Energy', status, short, detail, [
        'Choose wholefood snacks',
        'Watch portion sizes of high-fat/high-sugar foods',
      ])
    );
  }

  // Protein aspect
  if (!mealItems || mealItems.length === 0) {
    aspects.push(
      makeAspect(
        'protein',
        'Protein',
        'ok',
        'No data for protein yet.',
        'Log meals to see protein contribution. Aim for a source at each main meal for satiety and muscle maintenance.',
        ['Lean meat or fish', 'Legumes (lentils, chickpeas)', 'Dairy or eggs']
      )
    );
  } else {
    const status = proteinStatus;
    const short =
      status === 'low'
        ? 'Protein is below recommended range.'
        : status === 'high'
          ? 'Protein above recommended range.'
          : 'Protein within recommended range.';
    const detail =
      status === 'low'
        ? 'Protein contribution is low for your energy intake; include protein-rich foods to support muscle and fullness.'
        : status === 'high'
          ? 'Protein contribution is relatively high; ensure variety and balance with vegetables and wholegrains.'
          : 'Protein contribution aligns with typical AMDR recommendations.';
    aspects.push(
      makeAspect('protein', 'Protein', status, short, detail, [
        'Include a palm-sized portion of lean protein at meals',
        'Try Greek yogurt or cottage cheese as snacks',
      ])
    );
  }

  // Carbohydrates aspect
  if (!mealItems || mealItems.length === 0) {
    aspects.push(
      makeAspect(
        'carbs',
        'Carbohydrates',
        'ok',
        'No carbohydrate data yet.',
        'Log foods to see carbohydrate intake. Prefer wholegrains and fruit for sustained energy.',
        [
          'Wholegrain bread or oats',
          'Fruit',
          'Starchy vegetables like potato or sweet potato',
        ]
      )
    );
  } else {
    const status = carbsStatus;
    const short =
      status === 'low'
        ? 'Carbohydrates contribution is low.'
        : status === 'high'
          ? 'Carbohydrates are high relative to energy.'
          : 'Carbohydrates within recommended range.';
    const detail =
      status === 'low'
        ? 'Low carbohydrate intake can reduce available quick energy; include wholegrains or starchy vegetables.'
        : status === 'high'
          ? 'High carbohydrate contribution — prefer wholegrain sources, limit sugary snacks and sweetened drinks.'
          : 'Carbohydrate intake aligns with AMDR recommendations.';
    aspects.push(
      makeAspect('carbs', 'Carbohydrates', status, short, detail, [
        'Choose wholegrain options',
        'Swap sugary drinks for water or unsweetened beverages',
      ])
    );
  }

  // Fat aspect
  if (!mealItems || mealItems.length === 0) {
    aspects.push(
      makeAspect(
        'fat',
        'Fat',
        'ok',
        'No fat data yet.',
        'Log foods to see fat contribution. Prefer unsaturated fats and limit saturated/trans fats.',
        ['Avocado, olive oil, nuts', 'Limit fried foods and processed snacks']
      )
    );
  } else {
    const status = fatStatus;
    const short =
      status === 'low'
        ? 'Fat contribution is low.'
        : status === 'high'
          ? 'Fat is high relative to energy.'
          : 'Fat within recommended range.';
    const detail =
      status === 'low'
        ? 'Fat intake is lower than typical ranges; include small amounts of healthy fats for nutrient absorption.'
        : status === 'high'
          ? 'Fat contribution is high — reduce saturated fats and limit fried/processed foods.'
          : 'Fat intake aligns with AMDR recommendations.';
    aspects.push(
      makeAspect('fat', 'Fat', status, short, detail, [
        'Use olive oil, nuts, seeds',
        'Limit processed and fried foods',
      ])
    );
  }

  // Sugar aspect
  if (!mealItems || mealItems.length === 0) {
    aspects.push(
      makeAspect(
        'sugar',
        'Added Sugars',
        'ok',
        'No sugar data yet.',
        'Log foods to see added sugar intake — aim to limit added sugars where possible.',
        [
          'Limit sugary drinks',
          'Choose plain yogurt + fruit instead of sweetened',
        ]
      )
    );
  } else {
    const sugarG = macroTotals?.sugar_g ?? 0;
    const sugarStatus: 'low' | 'ok' | 'high' =
      sugarG > 50 ? 'high' : sugarG > 25 ? 'ok' : 'low';
    const short =
      sugarStatus === 'high'
        ? 'High added sugar intake.'
        : sugarStatus === 'ok'
          ? 'Moderate sugar intake.'
          : 'Low sugar intake.';
    const detail =
      sugarStatus === 'high'
        ? 'Added sugar appears high — consider reducing sweetened beverages and snacks.'
        : sugarStatus === 'ok'
          ? 'Added sugar is moderate — continue to prefer whole foods.'
          : 'Added sugar intake is low.';
    aspects.push(
      makeAspect('sugar', 'Added Sugars', sugarStatus, short, detail, [
        'Replace sweet drinks with water',
        'Choose unsweetened snacks',
      ])
    );
  }

  // Fibre aspect
  if (!mealItems || mealItems.length === 0) {
    aspects.push(
      makeAspect(
        'fibre',
        'Fibre',
        'ok',
        'No fibre data yet.',
        'Log foods to see fibre intake — aim for 25–30 g/day from wholefoods.',
        ['Increase vegetables and whole grains', 'Add legumes and seeds']
      )
    );
  } else {
    const fiberG = macroTotals?.fiber_g ?? 0;
    const fiberStatus: 'low' | 'ok' | 'high' =
      fiberG < 15 ? 'low' : fiberG < 30 ? 'ok' : 'high';
    const short =
      fiberStatus === 'low'
        ? 'Low fibre intake.'
        : fiberStatus === 'ok'
          ? 'Adequate fibre.'
          : 'High fibre intake.';
    const detail =
      fiberStatus === 'low'
        ? 'Fibre is low; increase vegetables, fruits and wholegrains.'
        : fiberStatus === 'ok'
          ? 'Fibre is in a reasonable range.'
          : 'Fibre intake is high.';
    aspects.push(
      makeAspect('fibre', 'Fibre', fiberStatus, short, detail, [
        'Add veg + fruit',
        'Swap to wholegrains',
      ])
    );
  }

  // Sodium aspect
  if (!mealItems || mealItems.length === 0) {
    aspects.push(
      makeAspect(
        'sodium',
        'Sodium',
        'ok',
        'No sodium data yet.',
        'Log foods to estimate sodium intake — aim to keep sodium low where possible.',
        ['Cook with less salt', 'Choose low-sodium packaged options']
      )
    );
  } else {
    const sodiumMg = macroTotals?.sodium_mg ?? 0;
    const sodiumStatus: 'low' | 'ok' | 'high' =
      sodiumMg > 2300 ? 'high' : sodiumMg > 1000 ? 'ok' : 'low';
    const short =
      sodiumStatus === 'high'
        ? 'High sodium intake.'
        : sodiumStatus === 'ok'
          ? 'Moderate sodium.'
          : 'Low sodium.';
    const detail =
      sodiumStatus === 'high'
        ? 'Sodium appears high; prefer fresh foods and limit processed items.'
        : sodiumStatus === 'ok'
          ? 'Sodium is moderate; continue to monitor packaged food choices.'
          : 'Sodium is low.';
    aspects.push(
      makeAspect('sodium', 'Sodium', sodiumStatus, short, detail, [
        'Use herbs/spices instead of salt',
        'Choose fresh over processed',
      ])
    );
  }

  const footnotes: Footnote[] = [
    {
      id: 'sodium',
      text: 'Aim for ≤2300 mg sodium/day; lower targets may benefit some people.',
    },
    {
      id: 'sugar',
      text: 'WHO recommends keeping added sugars <10% of energy; <5% for additional benefit.',
    },
    {
      id: 'fibre',
      text: 'Target ~25–30 g fibre/day for adults from wholefoods.',
    },
  ];

  return { aspects, footnotes, amdr, macroPct };
}
