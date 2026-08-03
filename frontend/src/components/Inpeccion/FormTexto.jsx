import { useState, useMemo, useRef, useEffect } from "react";
import { Save } from "lucide-react";
import { useDesviacion } from "../../core/Context/DesviacionContext";
import { SaveDesviacion } from "../../core/services/Desviacion.service";
import { useAuth } from "../../core/Context/AuthContext";

export default function FormTexto({ preguntasTexto, handleVerGeneral }) {
  const valoresIniciales = useMemo(
    () =>
      preguntasTexto.reduce((acc, p) => {
        acc[p.cod_pregunta] = "";
        return acc;
      }, {}),
    [preguntasTexto],
  );

  const { usuarioActual } = useAuth();

  const {
    reporteGenerado,
    articuloSeleccionado,
    asignarDatosGenerales,
    datosGenerales,
    limpiarDatosInspeccion,
  } = useDesviacion();

  const modo = useRef(datosGenerales ? "show" : "edit");

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
      setError(`Complete el campo: ${vacio.texto}`);
      return;
    }

    setError("");

    const respuestas = preguntasTexto.map((p) => ({
      cod_pregunta: p.cod_pregunta,
      resp_varchar: valores[p.cod_pregunta],
    }));

    const infoGeneral = preguntasTexto.map((p) => ({
      ...p,
      resp_varchar: valores[p.cod_pregunta],
    }));

    const peticion = await SaveDesviacion(
      reporteGenerado.codigoReporte,
      null,
      usuarioActual.usuario,
      articuloSeleccionado.cod_art,
      articuloSeleccionado.sub_cat_art,
      articuloSeleccionado.tipo_art,
      null,
      respuestas,
    );

    if (peticion.success) {
      asignarDatosGenerales(infoGeneral);
      handleVerGeneral();
    }
  };

  useEffect(() => {
    if (datosGenerales) {
     handleVerGeneral()
    }
  }, [datosGenerales]);

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
          console.log(datosGenerales);

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
                value={
                  modo.current === "show"
                    ? datosGenerales.find(
                        (x) => x.cod_pregunta === p.cod_pregunta,
                      )?.resp_varchar
                    : valores[id]
                }
                readOnly={modo.current === "show"}
                placeholder={`Ingrese ${p.motivo_desviacion.toLowerCase()}...`}
                onChange={(e) => handleChange(id, e.target.value)}
                onFocus={() => setFocusedId(id)}
                onBlur={() => setFocusedId(null)}
                style={{
                  width: "100%",
                  padding: "13px 16px",
                  borderRadius: 12,
                  border: `2px solid ${
                    isFocused
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
            marginTop: 8,
          }}
        >
          <button
            className="ins-modal-no"
            style={{ flex: 1, padding: 13 }}
            onClick={
              modo.current === "show"
                ? handleVerGeneral
                : limpiarDatosInspeccion
            }
          >
            ← Volver
          </button>

          {modo.current === "edit" && (
            <button
              className="ins-modal-yes"
              style={{ flex: 2, padding: 13, fontSize: 15 }}
              onClick={handleConfirmar}
            >
              Guardar Informacion
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
