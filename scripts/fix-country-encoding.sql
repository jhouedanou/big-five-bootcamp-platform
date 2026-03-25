-- ============================================================
-- fix-country-encoding.sql
-- Corrige les caractères mal encodés dans TOUTES les colonnes texte
-- Cause : CSV importé en Latin-1/ISO-8859-1, stocké en UTF-8
-- Les accents (é è ê ô à ù ç ...) deviennent "?" ou "C\uFFFDte"
-- ============================================================

-- ----------------------------------------------------------------
-- ÉTAPE 1 : Créer une fonction de remplacement des bytes corrompus
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION fix_latin1_encoding(s TEXT) RETURNS TEXT AS $$
BEGIN
  IF s IS NULL THEN RETURN NULL; END IF;
  RETURN
    replace(replace(replace(replace(replace(replace(replace(replace(
    replace(replace(replace(replace(replace(replace(replace(replace(
    replace(replace(replace(replace(replace(replace(replace(replace(
    replace(replace(replace(replace(replace(replace(replace(replace(
    s,
    chr(195)||chr(169), 'é'),
    chr(195)||chr(168), 'è'),
    chr(195)||chr(170), 'ê'),
    chr(195)||chr(171), 'ë'),
    chr(195)||chr(160), 'à'),
    chr(195)||chr(162), 'â'),
    chr(195)||chr(164), 'ä'),
    chr(195)||chr(180), 'ô'),
    chr(195)||chr(182), 'ö'),
    chr(195)||chr(185), 'ù'),
    chr(195)||chr(187), 'û'),
    chr(195)||chr(188), 'ü'),
    chr(195)||chr(174), 'î'),
    chr(195)||chr(175), 'ï'),
    chr(195)||chr(167), 'ç'),
    chr(195)||chr(177), 'ñ'),
    chr(195)||chr(137), 'É'),
    chr(195)||chr(136), 'È'),
    chr(195)||chr(138), 'Ê'),
    chr(195)||chr(128), 'À'),
    chr(195)||chr(148), 'Ô'),
    chr(195)||chr(153), 'Ù'),
    chr(195)||chr(142), 'Î'),
    chr(195)||chr(135), 'Ç'),
    chr(226)||chr(128)||chr(153), ''''),
    chr(226)||chr(128)||chr(156), '"'),
    chr(226)||chr(128)||chr(157), '"'),
    chr(226)||chr(128)||chr(147), '–'),
    chr(226)||chr(128)||chr(148), '—'),
    chr(239)||chr(191)||chr(189), '?'),
    chr(194)||chr(160), ' ')
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ----------------------------------------------------------------
-- ÉTAPE 2 : Appliquer sur toutes les colonnes texte
-- ----------------------------------------------------------------
UPDATE campaigns SET
  title       = fix_latin1_encoding(title),
  description = fix_latin1_encoding(description),
  summary     = fix_latin1_encoding(summary),
  brand       = fix_latin1_encoding(brand),
  agency      = fix_latin1_encoding(agency),
  country     = fix_latin1_encoding(country),
  category    = fix_latin1_encoding(category),
  format      = fix_latin1_encoding(format)
WHERE
     title       LIKE '%' || chr(195) || '%'
  OR description LIKE '%' || chr(195) || '%'
  OR summary     LIKE '%' || chr(195) || '%'
  OR brand       LIKE '%' || chr(195) || '%'
  OR agency      LIKE '%' || chr(195) || '%'
  OR country     LIKE '%' || chr(195) || '%'
  OR title       LIKE '%' || chr(239)||chr(191)||chr(189) || '%'
  OR description LIKE '%' || chr(239)||chr(191)||chr(189) || '%'
  OR summary     LIKE '%' || chr(239)||chr(191)||chr(189) || '%';

-- ----------------------------------------------------------------
-- ÉTAPE 3 : Normalisation finale du champ country
-- ----------------------------------------------------------------
UPDATE campaigns SET country = 'Côte d''Ivoire'
WHERE lower(trim(country)) IN ('cote d''ivoire', 'cote divoire')
  AND country <> 'Côte d''Ivoire';

UPDATE campaigns SET country = 'Sénégal'
WHERE lower(trim(country)) = 'senegal' AND country <> 'Sénégal';

UPDATE campaigns SET country = 'Bénin'
WHERE lower(trim(country)) = 'benin' AND country <> 'Bénin';

UPDATE campaigns SET country = 'Guinée'
WHERE lower(trim(country)) = 'guinee' AND country <> 'Guinée';

UPDATE campaigns SET country = 'Guinée-Bissau'
WHERE lower(trim(country)) IN ('guinee-bissau', 'guinea-bissau')
  AND country <> 'Guinée-Bissau';

UPDATE campaigns SET country = 'Cameroun'
WHERE lower(trim(country)) = 'cameroon' AND country <> 'Cameroun';

-- ----------------------------------------------------------------
-- VÉRIFICATION
-- ----------------------------------------------------------------
SELECT id, title, country
FROM campaigns
ORDER BY updated_at DESC NULLS LAST
LIMIT 10;

SELECT DISTINCT country, count(*) AS nb
FROM campaigns
WHERE country IS NOT NULL AND country <> ''
GROUP BY country
ORDER BY country;
