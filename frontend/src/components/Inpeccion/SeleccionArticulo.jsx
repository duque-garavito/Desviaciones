import  { useState, useEffect } from "react";
import logoApk from "../../assets/images/logo apk desviaciones.png";
import { Search, Loader2, Package, ChevronRight } from "lucide-react";
import "../../assets/css/Inspecciones.css";
import { useAuth } from "../../core/Context/AuthContext";
import { useDesviacion } from "../../core/Context/DesviacionContext";
import { obtenerArticulos } from "../../core/services/Articulo.service";
import MdlConfirmarInicio from "./MdlConfirmarInicio";

export default function SeleccionArticulo() {
  const [busqueda, setBusqueda] = useState("");
  const [lista, setLista] = useState([]);
  const [cargando, setCargando] = useState(false);
  const { usuarioActual, turnoActual, areaActiva } = useAuth();
  const {
    seleccionarArticulo,
    articuloSeleccionado,
    reporteGenerado,
    planSeleccionado,
  } = useDesviacion();

  const buscarArticulos = async (termino) => {
    setCargando(true);
    try {
      const params = new URLSearchParams();
      if (termino && termino.trim().length >= 2)
        params.set("buscar", termino.trim());
      if (usuarioActual && areaActiva?.cod_as)
        params.set("cod_as", String(areaActiva.cod_as).trim());
      if (planSeleccionado)
        params.set("cod_plan", String(planSeleccionado ?? "").trim());

      console.log("🔎 Buscando artículos:", Object.fromEntries(params));

      const peticion = await obtenerArticulos(params);

      if ("error" in peticion) {
        setLista([]);
        console.log(peticion.message);
        return;
      }
      setLista(peticion.articulos);
    } catch (error) {
      setLista([]);
      console.log(error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (!areaActiva?.cod_as) {
      setLista([]);
      return;
    }

    const txt = busqueda.trim();

    const timer = setTimeout(() => {
      buscarArticulos(txt);
    }, 700);

    return () => clearTimeout(timer);
  }, [busqueda, areaActiva]);

  const handleBusquedaChange = (valor) => {
    setBusqueda(valor);
  };

  return (
    <div className="ins-pantalla-articulo">
      {articuloSeleccionado && !reporteGenerado && <MdlConfirmarInicio />}
      {/* Encabezado elegante */}
      <div className="ins-articulo-header">
        <div className="ins-header-info">
          <div className="ins-header-icon-badge"> <Package size={22} /> </div>
          <div>
            <h2 className="ins-header-title">Selección de Artículo</h2>
            {areaActiva && (
              <div style={{ fontSize: "14px", color: "#64748b", marginTop: "2px" }}>
                Área actual: <strong>{areaActiva.nombre}</strong>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Buscador de alto impacto */}
      <div className="ins-buscador-wrapper">
        <Search size={20} className="ins-buscar-icon" />
        <input
          type="text"
          className="ins-buscar-input"
          placeholder="Buscar por código, nombre o descripción del artículo..."
          value={busqueda}
          onChange={(e) => handleBusquedaChange(e.target.value)}
        />
        {busqueda && (
          <button
            type="button"
            className="ins-clear-btn"
            onClick={() => handleBusquedaChange("")}
            title="Limpiar búsqueda"
          >
            &times;
          </button>
        )}
      </div>

      {/* Contador de resultados */}
      {!cargando && lista.length > 0 && (
        <div className="ins-resultados-count">
          <span>Catálogo de artículos ({lista.length})</span>
        </div>
      )}

      {/* Lista de artículos estilizada */}
      <div className="ins-articulo-lista">
        {cargando ? (
          <div className="ins-lista-loading">
            <Loader2 size={24} className="spinner" />
            <span>Cargando artículos disponibles...</span>
          </div>
        ) : lista.length === 0 ? (
          <div className="ins-lista-vacia">
            <Package size={36} className="ins-vacia-icon" />
            <p>
              {busqueda
                ? "No se encontraron artículos con ese término"
                : "No hay artículos registrados"}
            </p>
          </div>
        ) : (
          lista.map((art, idx) => {
            const codArt = art.cod_art || art.COD_ART || "";
            const nomArt =
              art.nom_articulo ||
              art.NOM_ARTICULO ||
              art.desc_art ||
              art.DESC_ART ||
              "";
            const descSubCat = art.desc_sub_cat || art.DESC_SUB_CAT || "";
            const descEtiqueta = art.desc_etiqueta || art.DESC_ETIQUETA || "";
            return (
              <div
                key={codArt || idx}
                className="ins-articulo-item"
                onClick={() => seleccionarArticulo(art)}
              >
                <div className="ins-art-content">
                  <div className="ins-art-row-top">
                    <span className="ins-art-cod">{codArt}</span>
                    {descSubCat && (
                      <span className="ins-art-subcat">{descSubCat}</span>
                    )}
                  </div>
                  <div className="ins-art-nom">{nomArt}</div>
                  {descEtiqueta && (
                    <div className="ins-art-desc">{descEtiqueta}</div>
                  )}
                </div>
                <ChevronRight size={18} className="ins-art-arrow" />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
