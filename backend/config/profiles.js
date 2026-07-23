/**
 * Perfiles de usuario autorizados 
 */
const PROFILES = {
  Supervisor: "SUP_CALI"
};

// Lista de perfiles con acceso autorizado al sistema (solo inspectores/supervisores)
const ALLOWED_PROFILES = [
  PROFILES.Supervisor
];

/**
 * Determina el Rol interno de la aplicación a partir del Perfil
 */
function getRolFromPerfil(perfil) {
  if (!perfil) return null;
  const norm = perfil.trim().toUpperCase();
  
  if (norm === PROFILES.Supervisor.toUpperCase()) {
    return 'SUPERVISOR';
  }
}

module.exports = {
  PROFILES,
  ALLOWED_PROFILES,
  getRolFromPerfil
};
