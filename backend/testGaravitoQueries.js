const db = require('./config/db');

function toLowercaseKeys(obj) {
  if (!obj) return obj;
  const newObj = {};
  for (const key of Object.keys(obj)) {
    newObj[key.toLowerCase()] = obj[key];
  }
  return newObj;
}

async function testGaravitoMapping() {
  const query = `
    SELECT DISTINCT
           t.cod_art_cong as COD_ART,
           t.descr as NOM_ARTICULO,
           '' as DESC_ETIQUETA,
           t2.DESC_SUB_CAT,
           t.cod_subcat as SUB_CAT_ART,
           es.especie
      FROM ARTICULO_CONGE t
      JOIN ARTICULO_SUB_CATEG t2 ON t.cod_subcat = t2.COD_SUB_CAT
      JOIN ARTICULO_CATEG t3 ON t2.cat_art = t3.cat_art
      INNER JOIN TG_ESPECIES es ON t3.cat_art = es.cat_art
      INNER JOIN PLANTILLA_CAUSA_DESVIACION pc ON t2.cod_sub_cat = pc.cod_sub_cat
     WHERE UPPER(t.descr) LIKE '%POTA%'
       AND pc.cod_as = 'FILE'
     ORDER BY NOM_ARTICULO
     FETCH FIRST 3 ROWS ONLY
  `;

  const rows = await db.execute(query);
  const mapped = rows.map(r => {
    const low = toLowercaseKeys(r);
    low.cod_art = low.cod_art || r.COD_ART || r.COD_ART_CONG || '';
    low.COD_ART = low.cod_art;

    low.nom_articulo = low.nom_articulo || r.NOM_ARTICULO || r.DESC_ART || r.DESCR || '';
    low.NOM_ARTICULO = low.nom_articulo;

    low.desc_sub_cat = low.desc_sub_cat || r.DESC_SUB_CAT || '';
    low.DESC_SUB_CAT = low.desc_sub_cat;

    low.desc_etiqueta = low.desc_etiqueta || r.DESC_ETIQUETA || '';
    low.DESC_ETIQUETA = low.desc_etiqueta;

    low.sub_cat_art = low.sub_cat_art || r.SUB_CAT_ART || r.COD_SUBCAT || '';
    low.SUB_CAT_ART = low.sub_cat_art;

    low.especie = low.especie || r.ESPECIE || '';
    low.ESPECIE = low.especie;

    return low;
  });

  console.log("Mapped results:", JSON.stringify(mapped, null, 2));
  process.exit(0);
}

testGaravitoMapping();
