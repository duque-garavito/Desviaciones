const UserModel = require("../models/userModel");
const { ALLOWED_PROFILES } = require("../config/profiles");

const login = async (req, res) => {
  const { username, email, password } = req.body;
  const userCode = username || email;

  try {
    const user = await UserModel.findByCredentials(userCode, password);
    // console.log(user + "USUARIO DE LA BD");
    // console.log(password + "PASSWORD DE LA BD");
    if (user) {
      // Verificar acceso por perfiles autorizados
      const perfilNorm = user.PERFIL ? user.PERFIL.trim().toUpperCase() : "";
      const allowedNorm = ALLOWED_PROFILES.map((p) => p.toUpperCase());

      if (!perfilNorm || !allowedNorm.includes(perfilNorm)) {
        console.log(
          `⚠️ Acceso restringido para el usuario ${userCode} con perfil: ${user.PERFIL}`,
        );
        return res.status(403).json({
          success: false,
          message:
            "Acceso no autorizado: Su perfil no cuenta con permisos para ingresar a este sistema.",
        });
      }

      let turno = {}

      if (perfilNorm === "SUP_CALI") {
        turno = await obtenertTurno(user.COD_USR);
      }



      res.json({
        success: true,
        usuario: {
          // id: user.COD_USR,
          nombre: user.NOMBRE,
          usuario: user.COD_USR,
          email: user.USUARIO,
          perfil: perfilNorm,
        },
        turno,
      });
    } else {
      res
        .status(401)
        .json({ success: false, message: "Usuario o contraseña incorrectos" });
    }
  } catch (error) {
    console.error("❌ Error en el login (Controller):", error);
    res.status(500).json({
      success: false,
      message: "Error del servidor al al iniciar sesion",
      details: error.message,
    });
  }
};


const ObtenerTurnoEndpoint = async (req, res) => {

  try {
    const { usuario } = req.body;
    const turno = await obtenertTurno(usuario);
    res.json({ success: true, turno });
  } catch (error) {
    console.error("Error al obtener turno (Controller):", error);
    res.status(500).json({
      error: true,
      message: "Error del servidor al al obtener turno",
      details: error.message,
    });
  }
}

const obtenertTurno = async (usuario) => {
  try {
    let areaAsignada = "Sin asignar";
    let turno = "Día";
    let codArea = "NAN";
    let codProgramacion = "NAN";
    let areas = [];

    const prog = await UserModel.getTodaySchedule(usuario);
    const item = Array.isArray(prog) ? prog[0] : prog;
    console.log(prog);
    if (item) {
      if (Array.isArray(prog) && prog.length > 1) {
        areaAsignada = prog.map((p) => p.AREA_NOMBRE).filter(Boolean).join(" / ");
      } else {
        areaAsignada = item.AREA_NOMBRE || item.area_nombre || "Área no definida";
      }
      turno = item.TURNO === "NOCHE" ? "Noche" : "Día";
      codArea = item.COD_AS || item.cod_as || "NAN";
      codProgramacion = item.COD_PROGRAMACION || item.cod_programacion || "NAN";
      // 🔹 AQUÍ SE MUESTRAN Y CONSTRUYEN TODAS LAS ÁREAS PROGRAMADAS DEL DÍA
      areas = Array.isArray(prog)
        ? prog.map((p) => ({
          cod_as: p.COD_AS || p.cod_as,
          nombre: p.AREA_NOMBRE || p.area_nombre || "Área sin nombre",
          cod_programacion: p.COD_PROGRAMACION || p.cod_programacion,
        }))
        : [];
    }

    return {
      areaAsignada,
      turno,
      codArea,
      codProgramacion,
      areas,
    };
  } catch (error) {
    console.error("error al obtener turno (ObtenerTurno)", error);
    return {
      areaAsignada: "Sin asignar",
      turno: "Día",
      codArea: "NAN",
      codProgramacion: "NAN",
      areas: [],
    }
  }
}

const getInspectors = async (req, res) => {
  try {
    const inspectors = await UserModel.getAllInspectors();
    res.json(inspectors);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  login,
  getInspectors,
  ObtenerTurnoEndpoint
};
