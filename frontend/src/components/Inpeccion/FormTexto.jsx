import { useState, useMemo } from "react";
import { Save } from "lucide-react";
import { useDesviacion } from "../../core/Context/DesviacionContext";
import { guardarDatosGenerales } from "../../core/services/Desviacion.service";
import { useAuth } from "../../core/Context/AuthContext";

export default function FormTexto({ preguntasTexto, handleVerGeneral }) {
  const { usuarioActual } = useAuth();

  const {
    reporteGenerado,
    articuloSeleccionado,
    seleccionarReporte,
    asignarDatosGenerales,
    datosGenerales,
    limpiarDatosInspeccion,
  } = useDesviacion();

  const yaGuardado = datosGenerales && datosGenerales.length > 0;

  const valoresIniciales = useMemo(
    () =>
      preguntasTexto.reduce((acc, p) => {
        const previo = datosGenerales?.find((x) => x.cod_pregunta === p.cod_pregunta)?.resp_varchar;
        acc[p.cod_pregunta] = previo || "";
        return acc;
      }, {}),
    [preguntasTexto, datosGenerales],
  );

  const [valores, setValores] = useState(valoresIniciales);
  const [focusedId, setFocusedId] = useState(null);
  const [error, setError] = useState("");

  const handleChange = (id, valor) => {
    setValores((prev) => ({
      ...prev,
      [id]: valor,
    }));

    if (error) setError("");
  };

  const handleConfirmar = async () => {
    const vacio = preguntasTexto.find((p) => !valores[p.cod_pregunta]?.trim());

    if (vacio) {
      setError(`Complete el campo: ${vacio.motivo_desviacion || "requerido"}`);
      return;
    }

    setError("");

    const infoGeneral = preguntasTexto.map((p) => ({
      ...p,
      resp_varchar: valores[p.cod_pregunta],
    }));

    // Guardar en Oracle en tiempo real
    const rawCod =
      typeof reporteGenerado === "string"
        ? reporteGenerado
        : reporteGenerado?.codigoReporte ||
          reporteGenerado?.cod_rep_c ||
          reporteGenerado?.COD_REP_C ||
          reporteGenerado?.codigo ||
          reporteGenerado?.id;

    const codReporteReal = Array.isArray(rawCod) ? rawCod[0] : rawCod;

    const peticion = await guardarDatosGenerales(
      codReporteReal,
      usuarioActual?.usuario || usuarioActual?.COD_USR,
      articuloSeleccionado?.cod_art || articuloSeleccionado?.COD_ART,
      articuloSeleccionado?.tipo_art || articuloSeleccionado?.TIPO_ART || "MP",
      infoGeneral.map((p) => ({
        cod_pregunta: p.cod_pregunta,
        cod_rv: p.cod_rv || null,
        resp_varchar: p.resp_varchar,
      })),
    );

    if (peticion.success) {
      if (peticion.cod_rep_c) {
        seleccionarReporte({
          codigoReporte: peticion.cod_rep_c,
          cod_rep_c: peticion.cod_rep_c,
          COD_REP_C: peticion.cod_rep_c,
          codigo: peticion.cod_rep_c,
        });
      }
      asignarDatosGenerales(infoGeneral);
      handleVerGeneral();
    } else {
      setError(`Error al registrar: ${peticion.message || "Verifique conexión"}`);
    }
  };

  return (
    <div className="ins-pantalla-articulo">
      <div className="ins-articulo-header">
        <div className="ins-header-info">
          <div className="ins-header-icon-badge">
            <Save size={22} />
          </div>

          <div>
            <h2 className="ins-header-title">Datos Generales</h2>
            <p
              style={{
                margin: 0,
                color: "var(--text-secondary)",
                fontSize: 13,
              }}
            >
              Complete todos los campos antes de iniciar el muestreo.
            </p>
          </div>
        </div>
      </div>

      <div
        style={{
          padding: "8px 4px",
          display: "flex",
          flexDirection: "column",
          gap: 14,
          maxWidth: 600,
          width: "100%",
        }}
      >
        {preguntasTexto.map((p) => {
          const id = p.cod_pregunta;
          const isFocused = focusedId === id;
          const hasValue = Boolean(valores[id]?.trim());

          return (
            <div key={id}>
              <label
                style={{
                  display: "block",
                  marginBottom: 6,
                  fontWeight: 700,
                  fontSize: 12,
                  color: isFocused ? "#3b82f6" : "var(--text-secondary)",
                  textTransform: "uppercase",
                  letterSpacing: ".07em",
                  transition: "color .2s",
                }}
              >
                {p.motivo_desviacion}
                <span style={{ color: "#ef4444" }}> *</span>
              </label>

              <input
                type="text"
                value={valores[id] || ""}
                placeholder={`Ingrese ${p.motivo_desviacion.toLowerCase()}...`}
                onChange={(e) => handleChange(id, e.target.value)}
                onFocus={() => setFocusedId(id)}
                onBlur={() => setFocusedId(null)}
                style={{
                  width: "100%",
                  padding: "13px 16px",
                  borderRadius: 12,
                  border: `2px solid ${isFocused
                      ? "#3b82f6"
                      : hasValue
                        ? "#93c5fd"
                        : "var(--border-color,#e2e8f0)"
                    }`,
                  background:
                    isFocused || hasValue ? "#eff6ff" : "var(--surface)",
                  color: "var(--text-primary)",
                  fontSize: 15,
                  fontWeight: 500,
                  outline: "none",
                  transition: ".2s",
                  boxSizing: "border-box",
                  boxShadow: isFocused
                    ? "0 0 0 4px rgba(59,130,246,.12)"
                    : "none",
                }}
              />
            </div>
          );
        })}

        {!!error && (
          <div
            style={{
              background: "#fef2f2",
              border: "1px solid #fca5a5",
              borderRadius: 10,
              padding: "10px 14px",
              color: "#dc2626",
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}

        <div
          style={{
            display: "flex",
            gap: 12,
            marginTop: 15,
          }}
        >
          <button
            className="ins-modal-no"
            style={{ flex: 1, padding: 14 }}
            onClick={limpiarDatosInspeccion}
          >
            ← Cancelar
          </button>

          <button
            className="ins-modal-yes"
            style={{ flex: 2, padding: 14, fontSize: 16, fontWeight: "bold" }}
            onClick={() => {
              handleConfirmar();
            }}
          >
            Continuar ➔
          </button>
        </div>
      </div>
    </div>
  );
}
