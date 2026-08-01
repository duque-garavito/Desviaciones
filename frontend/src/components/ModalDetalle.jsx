import React, { useState, useEffect } from 'react';
import { FileText, ClipboardList, X, ChevronDown, ChevronUp } from 'lucide-react';
import { API_BASE_URL } from '../config';
import './ModalDetalle.css';

function ModalDetalle({ id, isOpen, onClose }) {
  const [registrosGroup, setRegistrosGroup] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [activeTooltip, setActiveTooltip] = useState(null); // 'regId-preguntaId'

  useEffect(() => {
    if (isOpen && id) {
      cargarDetalle();
      setActiveTooltip(null);
    } else {
      setRegistrosGroup([]);
      setActiveTooltip(null);
    }
  }, [isOpen, id]);

  const cargarDetalle = async () => {
    setCargando(true);
    try {
      const ids = String(id).split(',').map(s => s.trim());
      const promesas = ids.map(async (singleId) => {
        const res = await fetch(`${API_BASE_URL}/api/registros/${singleId}`);
        return await res.json();
      });
      const data = await Promise.all(promesas);
      setRegistrosGroup(data);
    } catch (err) {
      console.error('Error al cargar detalle:', err);
    } finally {
      setCargando(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-detalle"
        style={{
          maxWidth: registrosGroup.length > 1 ? '99%' : '1150px',
          width: registrosGroup.length > 1 ? '1500px' : '92%'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3><FileText size={18} /> Detalle de Inspección</h3>
          <button className="btn-cerrar-modal" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          {cargando ? (
            <div className="loader-container">
              <div className="spinner"></div>
            </div>
          ) : registrosGroup.length > 0 ? (
            <>
              {(() => {
                const baseReg = registrosGroup[0];
                const getDuracionGroup = () => {
                  if (!baseReg?.hora_inicio_raw || !baseReg?.hora_fin_raw) return null;
                  const inicio = new Date(baseReg.hora_inicio_raw);
                  const fin = new Date(baseReg.hora_fin_raw);
                  const diffMs = fin - inicio;
                  if (diffMs < 0) return null;
                  const diffMins = Math.floor(diffMs / 60000);
                  const diffSecs = Math.floor((diffMs % 60000) / 1000);
                  return diffMins === 0 ? `${diffSecs} seg` : `${diffMins} min ${diffSecs} seg`;
                };

                return (
                  <div className="detalle-info-grid">
                    <div className="detalle-info-item">
                      <label>Inspector</label>
                      <span>{baseReg.inspector}</span>
                    </div>
                    <div className="detalle-info-item">
                      <label>Formulario</label>
                      <span>{baseReg.formulario}</span>
                    </div>
                    <div className="detalle-info-item">
                      <label>Área</label>
                      <span>{baseReg.area}</span>
                    </div>
                    <div className="detalle-info-item">
                      <label>Fecha</label>
                      <span>{baseReg.fecha}</span>
                    </div>
                    <div className="detalle-info-item">
                      <label>Hora Inicio</label>
                      <span>{baseReg.hora_inicio || '—'}</span>
                    </div>
                    <div className="detalle-info-item">
                      <label>Hora Fin</label>
                      <span>{baseReg.hora_fin || '—'}</span>
                    </div>
                    {baseReg.parte_produccion && (
                      <div className="detalle-info-item">
                        <label>Parte de Producción</label>
                        <span style={{ fontWeight: '600', color: '#1e40af' }}>{baseReg.parte_produccion}</span>
                      </div>
                    )}
                    {getDuracionGroup() && (
                      <div className="detalle-info-item">
                        <label>Duración</label>
                        <span style={{ color: 'var(--color-primary)', fontWeight: '600' }}>
                          {getDuracionGroup()}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="detalle-respuestas" style={{ overflowX: 'auto' }}>
                <h4><ClipboardList size={14} /> Respuestas por Artículo</h4>

                <table className="matriz-table" style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                  <thead>
                    <tr>
                      <th style={{ minWidth: '240px' }}>Variables / Preguntas</th>
                      {registrosGroup.map(reg => (
                        <th key={reg.id} style={{ minWidth: '220px', textAlign: 'center', padding: '10px 8px' }}>
                          <div style={{ fontWeight: '700', fontSize: '12px', whiteSpace: 'normal', lineHeight: '1.3' }}>
                            {reg.lote || '—'}{reg.nom_articulo ? ` - ${reg.nom_articulo}` : ''}
                          </div>
                          <div style={{ fontSize: '10px', color: '#cbd5e1', marginTop: '4px', fontFamily: 'monospace' }}>{reg.id}</div>
                        </th>
                      ))}
                    </tr>
                    {/* Fila 1: Cantidad Muestreada */}
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ textAlign: 'left', padding: '9px 14px', fontWeight: '700', fontSize: '13px', color: '#000000', backgroundColor: '#f1f5f9' }}>
                        Cantidad Muestreada
                      </th>
                      {registrosGroup.map(reg => {
                        let val = 0;
                        if (reg.cant_muestra !== null && reg.cant_muestra !== undefined) {
                          val = parseInt(reg.cant_muestra) || 0;
                        } else {
                          const muestraAns = reg.respuestas?.find(r => 
                            r.pregunta?.toUpperCase().includes('MUESTR') ||
                            r.pregunta?.toUpperCase().includes('CANTIDAD') ||
                            r.pregunta?.toUpperCase().includes('EVALUAD')
                          );
                          if (muestraAns && muestraAns.resp_number !== null && muestraAns.resp_number !== undefined) {
                            val = parseInt(muestraAns.resp_number) || 0;
                          } else if (reg.respuestas?.[0]?.resp_number !== null && reg.respuestas?.[0]?.resp_number !== undefined) {
                            val = parseInt(reg.respuestas[0].resp_number) || 0;
                          }
                        }
                        return (
                          <th key={reg.id} style={{ textAlign: 'center', padding: '9px 8px', fontWeight: '700', fontSize: '16px', color: '#000000', backgroundColor: '#F5F8FC' }}>
                            {val}
                          </th>
                        );
                      })}
                    </tr>

                      {/* Fila 2: Cantidad Sin Defecto */}
                      <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <th style={{ textAlign: 'left', padding: '9px 14px', fontWeight: '700', fontSize: '13px', color: '#000000', backgroundColor: '#f1f5f9' }}>
                          Cantidad Sin Defecto
                        </th>
                        {registrosGroup.map(reg => {
                          let cantMuestraNum = 0;
                          if (reg.cant_muestra !== null && reg.cant_muestra !== undefined) {
                            cantMuestraNum = parseInt(reg.cant_muestra) || 0;
                          }

                          // Sumar los conteos de respuestas de desvío (resp_number) o usar la cantidad de causas registradas
                          let totalDesviadas = 0;
                          if (reg.respuestas && Array.isArray(reg.respuestas)) {
                            reg.respuestas.forEach(ans => {
                              if (ans.resp_number !== null && ans.resp_number !== undefined) {
                                totalDesviadas += parseInt(ans.resp_number) || 0;
                              }
                            });
                          }
                          if (totalDesviadas === 0 && reg.causas && reg.causas.length > 0) {
                            totalDesviadas = reg.causas.length;
                          }

                          // Asegurar que las desviadas no superen el total muestreado
                          totalDesviadas = Math.min(totalDesviadas, cantMuestraNum);
                          const sinDefecto = Math.max(0, cantMuestraNum - totalDesviadas);

                          return (
                            <th key={reg.id} style={{ textAlign: 'center', padding: '9px 8px', fontWeight: '700', fontSize: '16px', color: '#000000', backgroundColor: '#F5F8FC' }}>
                              {sinDefecto}
                            </th>
                          );
                        })}
                      </tr>

                      {/* Fila 3: Cantidad Desviada (Con Defecto) */}
                      <tr style={{ borderBottom: '2px solid #cbd5e1' }}>
                        <th style={{ textAlign: 'left', padding: '9px 14px', fontWeight: '700', fontSize: '13px', color: '#000000', backgroundColor: '#f1f5f9' }}>
                          Cantidad Desviada (Con Defecto)
                        </th>
                        {registrosGroup.map(reg => {
                          let cantMuestraNum = 0;
                          if (reg.cant_muestra !== null && reg.cant_muestra !== undefined) {
                            cantMuestraNum = parseInt(reg.cant_muestra) || 0;
                          }

                          let totalDesviadas = 0;
                          if (reg.respuestas && Array.isArray(reg.respuestas)) {
                            reg.respuestas.forEach(ans => {
                              if (ans.resp_number !== null && ans.resp_number !== undefined) {
                                totalDesviadas += parseInt(ans.resp_number) || 0;
                              }
                            });
                          }
                          if (totalDesviadas === 0 && reg.causas && reg.causas.length > 0) {
                            totalDesviadas = reg.causas.length;
                          }

                          totalDesviadas = Math.min(totalDesviadas, cantMuestraNum);

                          return (
                            <th key={reg.id} style={{ textAlign: 'center', padding: '9px 8px', fontWeight: '700', fontSize: '16px', color: totalDesviadas > 0 ? '#dc2626' : '#000000', backgroundColor: '#F5F8FC' }}>
                              {totalDesviadas}
                            </th>
                          );
                        })}
                      </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      // Recolectar lista consolidada y única de preguntas a través de todos los muestreos del reporte
                      const preguntasMap = new Map();
                      registrosGroup.forEach(reg => {
                        (reg.respuestas || []).forEach(ans => {
                          if (ans.cod_pregunta && !preguntasMap.has(ans.cod_pregunta)) {
                            preguntasMap.set(ans.cod_pregunta, ans);
                          }
                        });
                      });
                      const todasPregs = Array.from(preguntasMap.values());
                      // Separar campos de texto (tipo V) de los de muestreo
                      const camposTexto = todasPregs.filter(p => p.tipo_campo === 'V');
                      const pregs = todasPregs.filter(p => p.tipo_campo !== 'V');

                      return (
                        <>
                          {/* Bloque de campos de recepción (tipo V) */}
                          {camposTexto.length > 0 && (
                            <tr>
                              <td colSpan={registrosGroup.length + 1} style={{ padding: 0 }}>
                                <div style={{
                                  background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)',
                                  border: '1.5px solid #bfdbfe',
                                  borderRadius: '10px',
                                  margin: '8px 4px',
                                  padding: '14px 18px',
                                  display: 'flex',
                                  flexWrap: 'wrap',
                                  gap: '20px',
                                  alignItems: 'flex-start'
                                }}>
                                  <div style={{ fontWeight: '700', fontSize: '12px', color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.06em', width: '100%', marginBottom: '4px' }}>
                                    📋 Datos de Recepción
                                  </div>
                                  {camposTexto.map(campo => {
                                    const val = registrosGroup[0]?.respuestas?.find(r => r.cod_pregunta === campo.cod_pregunta)?.resp_varchar;
                                    return (
                                      <div key={campo.cod_pregunta} style={{ minWidth: '150px' }}>
                                        <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '3px' }}>
                                          {campo.pregunta}
                                        </div>
                                        <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>
                                          {val || '—'}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </td>
                            </tr>
                          )}

                          {/* Filas del muestreo */}
                          {pregs.map((p, pIdx) => {
                        const isMainRow = pIdx < 3;
                        const isFirstDeviation = pIdx === 3;

                        const getCellClass = (ans, regId) => {
                          if (!ans) return 'matriz-cell-val';
                          let cls = 'matriz-cell-val';
                          if (ans.tipo_campo === 'B') {
                            const val = ans.resp_char?.trim().toUpperCase();
                            if (val === 'C' || val === 'S') cls += ' conforme';
                            if (val === 'N') cls += ' no-conforme';
                          } else if (ans.tipo_campo === 'N') {
                            const val = parseFloat(ans.resp_number);
                            if (!isNaN(val) && val >= 1 && pIdx >= 3) {
                              cls += ' no-conforme';
                            }
                          }
                          if (ans.resp_varchar && ans.resp_varchar.includes('Causas:')) {
                            cls += ' has-comment';
                          }
                          if (activeTooltip === `${regId}-${p.cod_pregunta}`) {
                            cls += ' active-tooltip';
                          }
                          return cls;
                        };

                        const getCellContent = (ans) => {
                          if (!ans) return '—';
                          if (ans.tipo_campo === 'B') {
                            const val = ans.resp_char?.trim().toUpperCase();
                            if (val === 'C') return 'Conforme';
                            if (val === 'S') return 'Sí';
                            if (val === 'N') return 'No Conforme';
                            return val || '—';
                          }
                          if (ans.tipo_campo === 'N') {
                            const val = ans.resp_number !== null && ans.resp_number !== undefined ? ans.resp_number : '—';
                            if (ans.resp_varchar && ans.resp_varchar.includes('Causas:')) {
                              let causasText = ans.resp_varchar;
                              if (causasText.startsWith('Causas: ')) causasText = causasText.substring(8);
                              return (
                                <>
                                  {val}
                                  <span className="tooltip-content">
                                    <strong>Desvíos registrados:</strong>
                                    {causasText.split(' | ').map((line, lIdx) => (
                                      <div key={lIdx} style={{ marginBottom: '2px' }}>• {line}</div>
                                    ))}
                                  </span>
                                </>
                              );
                            }
                            return val;
                          }
                          return ans.resp_varchar || '—';
                        };

                        if (isMainRow) {
                          return (
                            <tr key={p.cod_pregunta}>
                              <td className="matriz-header-pregunta" style={{ fontWeight: '600', backgroundColor: '#f1f5f9', color: '#334155' }}>
                                {p.pregunta}
                              </td>
                              {registrosGroup.map(reg => {
                                const ans = reg.respuestas.find(r => r.cod_pregunta === p.cod_pregunta);
                                const hasComment = ans?.resp_varchar && ans.resp_varchar.includes('Causas:');
                                return (
                                  <td
                                    key={reg.id}
                                    className={getCellClass(ans, reg.id)}
                                    style={{ textAlign: 'center', cursor: hasComment ? 'pointer' : 'default' }}
                                    onClick={() => {
                                      if (hasComment) {
                                        const key = `${reg.id}-${p.cod_pregunta}`;
                                        setActiveTooltip(activeTooltip === key ? null : key);
                                      }
                                    }}
                                  >
                                    {getCellContent(ans)}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        }

                        return (
                          <tr key={p.cod_pregunta}>
                            <td style={{ fontWeight: '500', color: '#475569' }}>
                              {p.pregunta.replace(/^DESVIACIONES\s+/i, '')}
                            </td>
                            {registrosGroup.map(reg => {
                              const ans = reg.respuestas.find(r => r.cod_pregunta === p.cod_pregunta);
                              const hasComment = ans?.resp_varchar && ans.resp_varchar.includes('Causas:');
                              return (
                                <td
                                  key={reg.id}
                                  className={getCellClass(ans, reg.id)}
                                  style={{ textAlign: 'center', cursor: hasComment ? 'pointer' : 'default' }}
                                  onClick={() => {
                                    if (hasComment) {
                                      const key = `${reg.id}-${p.cod_pregunta}`;
                                      setActiveTooltip(activeTooltip === key ? null : key);
                                    }
                                  }}
                                >
                                  {getCellContent(ans)}
                                </td>
                              );
                            })}
                          </tr>
                         );
                          })}
                        </>
                      );
                    })()}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p>No se encontró el registro.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default ModalDetalle;
