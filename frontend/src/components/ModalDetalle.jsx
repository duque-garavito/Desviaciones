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
          maxWidth: registrosGroup.length > 1 ? '95%' : '720px',
          width: registrosGroup.length > 1 ? '1200px' : '90%'
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
                    <p></p>
                    <div className="detalle-info-item">
                      <label>Hora Inicio</label>
                      <span>{baseReg.hora_inicio || '—'}</span>
                    </div>
                    <div className="detalle-info-item">
                      <label>Hora Fin</label>
                      <span>{baseReg.hora_fin || '—'}</span>
                    </div>
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
                  </thead>
                  <tbody>
                    {(() => {
                      const pregs = registrosGroup[0]?.respuestas || [];
                      return pregs.map((p, pIdx) => {
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
                      });
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
