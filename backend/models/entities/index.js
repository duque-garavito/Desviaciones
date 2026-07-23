const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');
const isOracle = sequelize.options.dialect === 'oracle';

// 1. Tablas Maestras (Sin dependencias)
const TipoCampo = sequelize.define('TipoCampo', {
  TIPO_CAMPO: { type: DataTypes.CHAR(1), primaryKey: true },
  DESCRIPCION: { type: DataTypes.STRING(20) },
  CAMPO: { type: DataTypes.STRING(20) }
}, { tableName: 'TIPO_CAMPO', timestamps: false });

const Area = sequelize.define('Area', {
  COD_AREA: { type: DataTypes.CHAR(3), primaryKey: true },
  DESCRIPCION: { 
    type: DataTypes.STRING(200),
    field: isOracle ? 'DESC_AREA' : 'DESCRIPCION'
  }
}, { tableName: 'AREA', timestamps: false });

const AreasSupervision = sequelize.define('AreasSupervision', {
  COD_AS: { type: DataTypes.CHAR(4), primaryKey: true },
  DESCR: { type: DataTypes.STRING(200) },
  FEC_REGISTRO: { 
    type: DataTypes.DATEONLY,
    field: 'FECH_REGISTRO'
  },
  FLAG_ESTADO: { type: DataTypes.INTEGER }
}, { tableName: 'AREAS_SUPERVISION', timestamps: false });

const ProgramacionCalidad = sequelize.define('ProgramacionCalidad', {
  COD_CC: { type: DataTypes.CHAR(12), primaryKey: true },
  FEC_INICIO: { type: DataTypes.DATEONLY },
  FEC_FIN: { type: DataTypes.DATEONLY },
  COD_USR: { type: DataTypes.CHAR(6) },
  FEC_REGISTRO: { type: DataTypes.DATEONLY }
}, { tableName: 'PROGRAMACION_CALIDAD', timestamps: false });

const MaestroEspecies = sequelize.define('MaestroEspecies', {
  COD_ESPECI: { 
    type: DataTypes.CHAR(12), 
    primaryKey: true,
    field: isOracle ? 'ESPECIE' : 'COD_ESPECI'
  },
  DESCRIPCION: { 
    type: DataTypes.STRING(100),
    field: isOracle ? 'DESCR_ESPECIE' : 'DESCRIPCION'
  }
}, { 
  tableName: isOracle ? 'TG_ESPECIES' : 'MAESTRO_ESPECIES', 
  timestamps: false 
});

// 2. Tablas de Primer Nivel
const MaestroPreguntas = sequelize.define('MaestroPreguntas', {
  COD_PREGUNTA: { type: DataTypes.CHAR(12), primaryKey: true },
  TIPO_CAMPO: { type: DataTypes.CHAR(1) },
  DESCR: { type: DataTypes.STRING(200) },
  FEC_REGISTRO: { type: DataTypes.DATEONLY },
  COD_USR: { type: DataTypes.CHAR(6) },
  UMBRAL_ALERTA: isOracle ? {
    type: DataTypes.VIRTUAL,
    get() { return null; }
  } : { type: DataTypes.INTEGER, allowNull: true, defaultValue: null },
  REQUIERE_JUSTIF: isOracle ? {
    type: DataTypes.VIRTUAL,
    get() { return 'N'; }
  } : { type: DataTypes.CHAR(1), defaultValue: 'N' }
}, { tableName: 'MAESTRO_PREGUNTAS', timestamps: false });

const MaestroReportes = sequelize.define('MaestroReportes', {
  COD_REPORTE: { type: DataTypes.CHAR(12), primaryKey: true, autoIncrement: true },
  COD_AREA: { type: DataTypes.CHAR(3) },
  COD_AS: { type: DataTypes.CHAR(4) },
  DESCR: { type: DataTypes.STRING(200) },
  FEC_REGISTRO: { type: DataTypes.DATEONLY },
  COD_USR: { type: DataTypes.CHAR(6) },
  COD_ESPECI: { type: DataTypes.CHAR(12) }
}, { tableName: 'MAESTRO_REPORTES', timestamps: false });

const ProgramacionCalidadDet = sequelize.define('ProgramacionCalidadDet', {
  COD_PRO: { type: DataTypes.CHAR(12), primaryKey: true },
  COD_CC: { type: DataTypes.CHAR(12) },
  COD_AS: { type: DataTypes.CHAR(4) },
  TURNO: { type: DataTypes.CHAR(4) },
  FEC_PROGRAM: { type: DataTypes.DATEONLY },
  COD_USR: { type: DataTypes.CHAR(6) },
  FEC_REGISTRO: { type: DataTypes.DATEONLY }
}, { tableName: 'PROGRAMACION_CALIDAD_DET', timestamps: false });

// 3. Tablas de Segundo Nivel
const ReportesVersionado = sequelize.define('ReportesVersionado', {
  COD_RV: { type: DataTypes.CHAR(12), primaryKey: true, autoIncrement: true },
  COD_REPORTE: { type: DataTypes.CHAR(12) },
  COD_VERSION: { type: DataTypes.INTEGER },
  FLAG_ESTADO: { type: DataTypes.CHAR(1) },
  FEC_REGISTRO: { type: DataTypes.DATEONLY },
  COD_USR: { type: DataTypes.CHAR(6) }
}, { tableName: 'REPORTES_VERSIONADO', timestamps: false });

// 4. Tablas de Tercer Nivel
const PreguntasVersionado = sequelize.define('PreguntasVersionado', {
  COD_PREGUNTA: { type: DataTypes.CHAR(12), primaryKey: true },
  COD_RV: { type: DataTypes.CHAR(12), primaryKey: true },
  FEC_REGISTRO: { type: DataTypes.DATEONLY },
  COD_USR: { type: DataTypes.CHAR(6) }
}, { tableName: 'PREGUNTAS_VERSIONADO', timestamps: false });

const ReporteRespuestas = sequelize.define('ReporteRespuestas', {
  COD_REP_C: { type: DataTypes.CHAR(12), primaryKey: true },
  COD_RV: { type: DataTypes.CHAR(12) },
  TIPO_REF: { type: DataTypes.CHAR(4) },
  NRO_REF: { type: DataTypes.CHAR(12) },
  COD_USR: { type: DataTypes.CHAR(6) },
  FEC_REGISTRO: { type: DataTypes.DATEONLY },
  HORA_INICIO: { type: DataTypes.DATE },
  HORA_FIN: { type: DataTypes.DATE }
}, { tableName: 'REPORTE_RESPUESTAS', timestamps: false });

// 5. Tablas de Cuarto Nivel
const ReporteRespuestasDet = sequelize.define('ReporteRespuestasDet', {
  COD_REP_C: { type: DataTypes.CHAR(12), primaryKey: true },
  ITEM: { type: DataTypes.INTEGER, primaryKey: true },
  COD_PREGUNTA: { type: DataTypes.CHAR(12) },
  COD_RV: { type: DataTypes.CHAR(12) },
  RESP_BLOB: { type: DataTypes.BLOB },
  RESP_TIPO_BLOB: { type: DataTypes.STRING(8) },
  RESP_CHAR: { type: DataTypes.CHAR(1) },
  RESP_NUMBER: { type: DataTypes.INTEGER },
  RESP_VARCHAR: { type: DataTypes.STRING(200) },
  COD_USR: { type: DataTypes.CHAR(6) },
  FEC_REGISTRO: { type: DataTypes.DATEONLY }
}, { tableName: 'REPORTE_RESPUESTAS_DET', timestamps: false });

const isOracleUser = sequelize.options.dialect === 'oracle';

const usuarioAttributes = {
  COD_USR: { type: DataTypes.CHAR(6), primaryKey: true },
  NOMBRE: { type: DataTypes.STRING(100) },
  CORREO: { 
    type: DataTypes.STRING(100),
    field: isOracleUser ? 'EMAIL' : 'USUARIO'
  },
  PASSWORD: { 
    type: DataTypes.STRING(100),
    field: isOracleUser ? 'CLAVE' : 'PASSWORD'
  },
  PERFIL: { type: DataTypes.STRING(50) }
};

const Usuario = sequelize.define('Usuario', usuarioAttributes, { 
  tableName: isOracleUser ? 'USUARIO' : 'USUARIOS', 
  timestamps: false 
});

const CategoriaCausa = sequelize.define('CategoriaCausa', {
  COD_CAT_CAUSA: { type: DataTypes.CHAR(6), primaryKey: true },
  DESCR: { type: DataTypes.STRING(200) },
  FEC_REGISTRO: { type: DataTypes.DATE },
  COD_USR: { type: DataTypes.CHAR(6) }
}, { tableName: 'CATEGORIA_CAUSA', timestamps: false });

const MaestroCausasDesviacion = sequelize.define('MaestroCausasDesviacion', {
  COD_MCD: { type: DataTypes.CHAR(12), primaryKey: true },
  COD_CAT_CAUSA: { type: DataTypes.CHAR(6) },
  DESCR: { type: DataTypes.STRING(200) },
  COD_SUB_CAT: { type: DataTypes.CHAR(6) },
  COD_ESPECI: { type: DataTypes.CHAR(12) },
  FEC_REGISTRO: { type: DataTypes.DATE },
  COD_USR: { type: DataTypes.CHAR(6) }
}, { tableName: 'MAESTRO_CAUSAS_DESVIACION', timestamps: false });

const PlantillaCausaDesviacion = sequelize.define('PlantillaCausaDesviacion', {
  COD_CD: { type: DataTypes.CHAR(12), primaryKey: true },
  COD_REPORTE: { type: DataTypes.CHAR(12) },
  COD_AS: { type: DataTypes.CHAR(4) },
  COD_SUB_CAT: { type: DataTypes.CHAR(6) },
  COD_ESPECI: { type: DataTypes.CHAR(12) },
  FEC_REGISTRO: {
    type: DataTypes.DATE,
    field: isOracle ? 'FEC_REFGISTRO' : 'FEC_REGISTRO'
  },
  COD_USR: { type: DataTypes.CHAR(6) }
}, { tableName: 'PLANTILLA_CAUSA_DESVIACION', timestamps: false });

const ReporteRespuestasDetCausas = sequelize.define('ReporteRespuestasDetCausas', {
  COD_REP_C: { type: DataTypes.CHAR(12), primaryKey: true },
  ITEM: { type: DataTypes.INTEGER, primaryKey: true },
  COD_MCD: { type: DataTypes.CHAR(12), primaryKey: true },
  COD_SUB_CAT: { type: DataTypes.CHAR(6) },
  COD_ESPECI: { type: DataTypes.CHAR(12) }
}, { tableName: 'REPORTE_RESPUESTAS_DET_CAUSAS', timestamps: false });

const ReporteRespuestasDetDesviacionArticulo = sequelize.define('ReporteRespuestasDetDesviacionArticulo', {
  COD_REP_C: { type: DataTypes.CHAR(12), primaryKey: true },
  ITEM: { type: DataTypes.INTEGER, primaryKey: true },
  COD_ART: { type: DataTypes.CHAR(12) },
  TIPO_ART: { type: DataTypes.CHAR(4) }
}, { tableName: 'REPORTE_RESPUESTAS_DET_DESVIACION_ARTICULO', timestamps: false });

// ===============================================
// ASOCIACIONES (RELACIONES)
// ===============================================

MaestroPreguntas.belongsTo(TipoCampo, { foreignKey: 'TIPO_CAMPO' });
TipoCampo.hasMany(MaestroPreguntas, { foreignKey: 'TIPO_CAMPO' });

MaestroReportes.belongsTo(Area, { foreignKey: 'COD_AREA', as: 'area' });
Area.hasMany(MaestroReportes, { foreignKey: 'COD_AREA' });

MaestroReportes.belongsTo(MaestroEspecies, { foreignKey: 'COD_ESPECI', as: 'especie' });
MaestroEspecies.hasMany(MaestroReportes, { foreignKey: 'COD_ESPECI' });

MaestroReportes.belongsTo(AreasSupervision, { foreignKey: 'COD_AS', as: 'supervision' });
AreasSupervision.hasMany(MaestroReportes, { foreignKey: 'COD_AS' });

ProgramacionCalidadDet.belongsTo(ProgramacionCalidad, { foreignKey: 'COD_CC' });
ProgramacionCalidad.hasMany(ProgramacionCalidadDet, { foreignKey: 'COD_CC' });

ProgramacionCalidadDet.belongsTo(AreasSupervision, { foreignKey: 'COD_AS', as: 'areaSupervision' });
AreasSupervision.hasMany(ProgramacionCalidadDet, { foreignKey: 'COD_AS' });

ReportesVersionado.belongsTo(MaestroReportes, { foreignKey: 'COD_REPORTE', as: 'maestro' });
MaestroReportes.hasMany(ReportesVersionado, { foreignKey: 'COD_REPORTE' });

PreguntasVersionado.belongsTo(MaestroPreguntas, { foreignKey: 'COD_PREGUNTA', as: 'pregunta' });
MaestroPreguntas.hasMany(PreguntasVersionado, { foreignKey: 'COD_PREGUNTA' });

PreguntasVersionado.belongsTo(ReportesVersionado, { foreignKey: 'COD_RV' });
ReportesVersionado.hasMany(PreguntasVersionado, { foreignKey: 'COD_RV' });

ReporteRespuestas.belongsTo(ReportesVersionado, { foreignKey: 'COD_RV', as: 'version' });
ReportesVersionado.hasMany(ReporteRespuestas, { foreignKey: 'COD_RV' });

ReporteRespuestasDet.belongsTo(ReporteRespuestas, { foreignKey: 'COD_REP_C' });
ReporteRespuestas.hasMany(ReporteRespuestasDet, { foreignKey: 'COD_REP_C' });

// Relaciones para Causas de Desviación
MaestroCausasDesviacion.belongsTo(CategoriaCausa, { foreignKey: 'COD_CAT_CAUSA', as: 'categoria' });
CategoriaCausa.hasMany(MaestroCausasDesviacion, { foreignKey: 'COD_CAT_CAUSA' });

ReporteRespuestasDetCausas.belongsTo(MaestroCausasDesviacion, { foreignKey: 'COD_MCD', as: 'causa' });
MaestroCausasDesviacion.hasMany(ReporteRespuestasDetCausas, { foreignKey: 'COD_MCD' });

ReporteRespuestasDet.hasMany(ReporteRespuestasDetCausas, { foreignKey: 'COD_REP_C', as: 'causas' });
ReporteRespuestasDetCausas.belongsTo(ReporteRespuestasDet, { foreignKey: 'COD_REP_C', as: 'respuestaDet' });

CategoriaCausa.belongsTo(Usuario, { foreignKey: 'COD_USR', as: 'usuario' });
Usuario.hasMany(CategoriaCausa, { foreignKey: 'COD_USR' });

MaestroCausasDesviacion.belongsTo(Usuario, { foreignKey: 'COD_USR', as: 'usuario' });
Usuario.hasMany(MaestroCausasDesviacion, { foreignKey: 'COD_USR' });

module.exports = {
  sequelize,
  TipoCampo,
  Area,
  AreasSupervision,
  ProgramacionCalidad,
  MaestroEspecies,
  MaestroPreguntas,
  MaestroReportes,
  ProgramacionCalidadDet,
  ReportesVersionado,
  PreguntasVersionado,
  ReporteRespuestas,
  ReporteRespuestasDet,
  Usuario,
  CategoriaCausa,
  MaestroCausasDesviacion,
  PlantillaCausaDesviacion,
  ReporteRespuestasDetCausas,
  ReporteRespuestasDetDesviacionArticulo
};
