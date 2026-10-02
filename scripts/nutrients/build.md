# Rebuilding `src/engine/foodMicros.js`

1. Download from https://fdc.nal.usda.gov/download-datasets (no key needed):
   - `FoodData_Central_survey_food_csv_2024-10-31.zip` (FNDDS)
   - `FoodData_Central_sr_legacy_food_csv_2018-04.zip`
2. Unzip next to `extract_fdc.py` and run `python3 extract_fdc.py` → `raw.json`.
   `MAP` in the script links each built-in food id to an FDC id (F = FNDDS, S = SR Legacy).
3. Convert `raw.json` to `foodMicros.js`, scaling mixed dishes by `our kcal / USDA kcal`
   and dropping foods whose USDA entry disagrees with reality (paneer, whey).
   Always compare USDA macros with ours first — mismatches mean the match is wrong.
