import fs from 'fs';
import path from 'path';

const artifactsDir = 'C:\\Users\\boanl\\.gemini\\antigravity-ide\\brain\\8645c417-9868-46b2-8bf4-1198ca7a2ed7';
const destDir = path.resolve(process.cwd(), 'public/images/products');

// Map of product ID to filename prefix
const productMap = {
  'p001': 'p001_tomatoes',
  'p002': 'p002_carrots',
  'p003': 'p003_potatoes',
  'p004': 'p004_pumpkin',
  'p005': 'p005_onions',
  'p006': 'p006_water_spinach',
  'p007': 'p007_cabbage',
  'p008': 'p008_broccoli',
  'p009': 'p009_bell_pepper',
  'p010': 'p010_garlic',
  'p011': 'p011_limes',
  'p012': 'p012_lettuce',
  'p013': 'p013_pork_collar',
  'p014': 'p014_pork_belly',
  'p015': 'p015_pork_ribs',
  'p016': 'p016_beef_sirloin',
  'p017': 'p017_beef_shank',
  'p018': 'p018_pork_bones',
  'p019': 'p019_ground_pork',
  'p020': 'p020_beef_striploin',
  'p021': 'p021_salmon',
  'p022': 'p022_tiger_shrimp',
  'p023': 'p023_squid',
  'p024': 'p024_octopus',
  'p025': 'p025_basa_fish',
  'p026': 'p026_mackerel',
  'p027': 'p027_clams',
  'p028': 'p028_sea_crab',
  'p029': 'p029_whole_chicken',
  'p030': 'p030_chicken_drumsticks',
  'p031': 'p031_chicken_wings',
  'p032': 'p032_chicken_eggs',
  'p033': 'p033_quail_eggs',
  'p034': 'p034_chicken_breast',
  'p035': 'p035_sausage',
  'p036': 'p036_spring_rolls',
  'p037': 'p037_fish_balls',
  'p038': 'p038_french_fries',
  'p039': 'p039_dumplings',
  'p040': 'p040_cheese_sticks',
  'p041': 'p041_beef_balls',
  'p042': 'p042_fish_sauce',
  'p043': 'p043_cooking_oil',
  'p044': 'p044_chili_sauce',
  'p045': 'p045_sugar',
  'p046': 'p046_msg',
  'p047': 'p047_white_pepper',
  'p048': 'p048_iodized_salt',
  'p049': 'p049_napa_cabbage',
  'p050': 'p050_okra',
  'p051': 'p051_sweet_corn',
  'p052': 'p052_purple_potato',
  'p053': 'p053_celery',
  'p054': 'p054_luffa',
  'p055': 'p055_ground_beef',
  'p056': 'p056_pork_chops',
  'p057': 'p057_pork_shoulder',
  'p058': 'p058_pork_liver',
  'p059': 'p059_beef_tendon',
  'p060': 'p060_goat_leg',
  'p061': 'p061_white_shrimp',
  'p062': 'p062_sea_bass',
  'p063': 'p063_baby_lobster',
  'p064': 'p064_oysters',
  'p065': 'p065_tuna_loin',
  'p066': 'p066_blue_crab',
  'p067': 'p067_whole_duck',
  'p068': 'p068_broiler_chicken',
  'p069': 'p069_chicken_feet',
  'p070': 'p070_salted_duck_eggs',
  'p071': 'p071_chicken_giblets',
  'p072': 'p072_chicken_carcass',
  'p073': 'p073_breaded_shrimp',
  'p074': 'p074_vietnamese_ham',
  'p075': 'p075_frozen_salmon',
  'p076': 'p076_chicken_nuggets',
  'p077': 'p077_wontons',
  'p078': 'p078_mini_pizza',
  'p079': 'p079_soy_sauce',
  'p080': 'p080_knorr_seasoning',
  'p081': 'p081_rice_vinegar',
  'p082': 'p082_butter',
  'p083': 'p083_honey',
  'p084': 'p084_coconut_cream',
  'p085': 'p085_ketchup',
  'p086': 'p086_flour',
  'p087': 'p087_cornstarch',
  'p088': 'p088_dried_chili',
  'p089': 'p089_cinnamon',
  'p090': 'p090_star_anise',
  'p091': 'p091_lemongrass',
  'p092': 'p092_ground_ginger',
  'p093': 'p093_turmeric',
  'p094': 'p094_phu_quoc_fish_sauce',
  'p095': 'p095_sweet_soy_sauce',
  'p096': 'p096_miso_paste',
  'p097': 'p097_sesame_oil',
  'p098': 'p098_curry_powder',
  'p099': 'p099_gochugaru',
  'p100': 'p100_oyster_sauce',
};

// Read all files in artifacts dir
const allFiles = fs.readdirSync(artifactsDir);

let copied = 0;
let missing = [];

for (const [id, prefix] of Object.entries(productMap)) {
  // Find the matching file
  const match = allFiles.find(f => f.startsWith(prefix) && f.endsWith('.png'));
  if (match) {
    const src = path.join(artifactsDir, match);
    const dest = path.join(destDir, `${id}.png`);
    fs.copyFileSync(src, dest);
    copied++;
    console.log(`✓ ${id} -> ${match}`);
  } else {
    missing.push(id);
    console.log(`✗ MISSING: ${id} (looking for ${prefix}*.png)`);
  }
}

console.log(`\nDone! Copied ${copied}/100 images. Missing: ${missing.length}`);
if (missing.length) console.log('Missing:', missing.join(', '));
