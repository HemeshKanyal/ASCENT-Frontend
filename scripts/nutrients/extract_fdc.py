import csv, json
MAP = dict(chicken_breast="F2705956", chicken_thigh="F2706030", beef_lean="S171794", goat_meat="F2705908", chicken_liver="S171061",
 salmon="F2706286", tuna_canned="S173709", sardines="F2706293", shrimp="F2706363", egg="F2707154", egg_white="S172183",
 paneer="F2705740", tofu="S172475", tempeh="S172467", soy_chunks="S174275", edamame="F2707436", whey="S173177",
 greek_yogurt="F2705424", curd="F2705418", cottage_cheese="S172182", milk_whole="F2705385", milk_skim="S171269",
 soy_milk="F2705405", cheddar="F2705709", lentils="F2707425", dal_tadka="F2707427", chickpeas="F2707416", chole="F2707415",
 kidney_beans="F2707381", rajma_curry="F2707380", hummus="F2707402", white_rice="F2708408", brown_rice="F2708414",
 roti="F2707713", wholewheat_bread="F2707709", white_bread="F2707598", oats="F2708489", oatmeal_cooked="F2708381",
 pasta="F2708357", quinoa="S168917", potato="F2709385", sweet_potato="F2709699", idli="F2708346", dosa="F2708347",
 upma="F2709128", granola="F2708461", cornflakes="F2708453", fried_rice="S167668", banana="F2709224", apple="F2709215",
 orange="F2709171", mango="F2709242", grapes="F2709237", strawberries="F2709283", cherries="F2709231", watermelon="F2709270",
 papaya="F2709246", dates="S171726", broccoli="F2709643", spinach="F2709614", salad="F2709789", carrot="F2709660",
 mushrooms="F2709793", peas="S170017", cauliflower="F2709777", sabzi="F2710067", palak_paneer="F2709631",
 olive_oil="F2710186", ghee="F2710168", butter="F2710155", peanut_butter="F2707537", almonds="F2707486", peanuts="F2707514",
 walnuts="F2707531", chia="F2707590", avocado="F2709223", dark_chocolate="S170273", butter_chicken="F2706437",
 chicken_biryani="F2706538", pizza="F2708616", burger="F2706920", fries="F2709461", samosa="F2708730", biscuits="F2707899",
 protein_bar="F2708124", coffee="F2710375", orange_juice="F2709186", cola="F2710541", sports_drink="F2710771", beer="F2710616",
 honey="F2710281", sugar="F2710258")
KEYS = {"269":"sugar","606":"satFat","601":"cholesterol","307":"sodium","306":"potassium","301":"calcium","303":"iron",
 "304":"magnesium","309":"zinc","305":"phosphorus","320":"vitA","401":"vitC","328":"vitD","323":"vitE","430":"vitK",
 "415":"vitB6","418":"vitB12","435":"folate","629":"epa","621":"dha","262":"caffeine","208":"_kcal","203":"_protein","204":"_fat","205":"_carbs"}
DIRS = {"F":"FoodData_Central_survey_food_csv_2024-10-31/FoodData_Central_survey_food_csv_2024-10-31",
        "S":"FoodData_Central_sr_legacy_food_csv_2018-04/FoodData_Central_sr_legacy_food_csv_2018-04"}
out = {}
for src, d in DIRS.items():
    # SR Legacy references nutrients by id; the survey (FNDDS) file uses the nutrient number directly.
    if src == "S":
        nid = {r["id"]: KEYS[r["nutrient_nbr"].split(".")[0]] for r in csv.DictReader(open(f"{d}/nutrient.csv")) if r["nutrient_nbr"] and r["nutrient_nbr"].split(".")[0] in KEYS}
    else:
        nid = dict(KEYS)
    want = {v[1:]: k for k, v in MAP.items() if v[0] == src}
    for r in csv.DictReader(open(f"{d}/food_nutrient.csv")):
        food = want.get(r["fdc_id"])
        key = nid.get(r["nutrient_id"])
        if food and key and r["amount"]:
            out.setdefault(food, {})[key] = float(r["amount"])
json.dump(out, open("raw.json","w"))
res = {}
for food, n in out.items():
    n = {k: v for k, v in n.items() if not k.startswith("_")}
    if "epa" in n or "dha" in n:
        n["omega3"] = n.pop("epa", 0) + n.pop("dha", 0)
    res[food] = {k: (round(v, 3) if v < 1 else round(v, 1)) for k, v in sorted(n.items())}
missing = [k for k in MAP if k not in res]
print("foods:", len(res), "missing:", missing)
print("sample egg:", res["egg"])
print("sample paneer:", res["paneer"])
print("sample salmon:", res["salmon"])
print("nutrient coverage:", {k: sum(1 for r in res.values() if k in r) for k in sorted(set(KEYS.values()) - {"epa","dha"} | {"omega3"})})
json.dump({"source": "USDA FoodData Central (FNDDS 2021-2023 & SR Legacy), per 100 g", "foods": res}, open("micros.json", "w"), separators=(",", ":"))
