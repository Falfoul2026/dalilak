-- Dalilak – 0005 reference data (safe to re-run).

insert into public.categories (slug, name_ar, name_fr, name_nl, name_en, icon, sort_order, requires_languages) values
  ('food',   'مطاعم',               'Restaurants',             'Restaurants',              'Restaurants',            '🍽️', 1, false),
  ('meat',   'ملاحم وسوبرماركت حلال', 'Boucheries et épiceries halal', 'Halal slagers en supermarkten', 'Halal butchers & groceries', '🥩', 2, false),
  ('sweets', 'حلويات',              'Pâtisseries orientales',  'Oosterse zoetigheden',     'Sweets & pastries',      '🍰', 3, false),
  ('cloth',  'ملابس وقفاطين',        'Vêtements',               'Kleding',                  'Clothing',               '👗', 4, false),
  ('beauty', 'حلاقة وتجميل',         'Coiffure et beauté',      'Kapper en schoonheid',     'Barbers & beauty',       '💈', 5, false),
  ('doc',    'أطباء',               'Médecins',                'Artsen',                   'Doctors',                '🩺', 6, true),
  ('legal',  'محامون ومترجمون',       'Avocats et traducteurs',  'Advocaten en vertalers',   'Lawyers & translators',  '⚖️', 7, true),
  ('travel', 'سفر وتحويل أموال',      'Voyages et transferts',   'Reizen en geldtransfers',  'Travel & money transfer','✈️', 8, false),
  ('edu',    'مساجد وجمعيات',         'Mosquées et associations','Moskeeën en verenigingen', 'Mosques & associations', '🕌', 9, false)
on conflict (slug) do update set
  name_ar = excluded.name_ar, name_fr = excluded.name_fr, name_nl = excluded.name_nl, name_en = excluded.name_en,
  icon = excluded.icon, sort_order = excluded.sort_order, requires_languages = excluded.requires_languages;

insert into public.provinces (slug, name_ar, name_fr, name_nl, name_en, is_launch, sort_order) values
  ('brussels',        'بروكسل',            'Bruxelles-Capitale',  'Brussel-Hoofdstad',  'Brussels',          true,  1),
  ('antwerp',         'أنتويرب',           'Anvers',              'Antwerpen',          'Antwerp',           true,  2),
  ('liege',           'لييج',              'Liège',               'Luik',               'Liège',             true,  3),
  ('flemish-brabant', 'برابانت الفلمنكية',  'Brabant flamand',     'Vlaams-Brabant',     'Flemish Brabant',   false, 10),
  ('walloon-brabant', 'برابانت الوالونية',  'Brabant wallon',      'Waals-Brabant',      'Walloon Brabant',   false, 11),
  ('east-flanders',   'فلاندرز الشرقية',    'Flandre-Orientale',   'Oost-Vlaanderen',    'East Flanders',     false, 12),
  ('west-flanders',   'فلاندرز الغربية',    'Flandre-Occidentale', 'West-Vlaanderen',    'West Flanders',     false, 13),
  ('limburg',         'ليمبورغ',           'Limbourg',            'Limburg',            'Limburg',           false, 14),
  ('hainaut',         'هينو',              'Hainaut',             'Henegouwen',         'Hainaut',           false, 15),
  ('namur',           'نامور',             'Namur',               'Namen',              'Namur',             false, 16),
  ('luxembourg',      'لوكسمبورغ البلجيكية', 'Luxembourg',          'Luxemburg',          'Luxembourg',        false, 17)
on conflict (slug) do update set
  name_ar = excluded.name_ar, name_fr = excluded.name_fr, name_nl = excluded.name_nl, name_en = excluded.name_en,
  is_launch = excluded.is_launch, sort_order = excluded.sort_order;
