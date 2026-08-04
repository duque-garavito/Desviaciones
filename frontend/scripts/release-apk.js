import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Raiz del proyecto frontend (donde vive package.json y la carpeta android/).
const PROJECT_ROOT = path.resolve(__dirname, "..");

// Backend del propio proyecto: sirve /api/version y la carpeta updates/.
//
// DESVIACIONES_BACKEND_ROOT permite publicar en un backend que no sea el de al
// lado, por ejemplo una ruta de red al servidor de produccion. Lo respeta
// tambien el modo --auto que dispara Gradle, que no puede pasar flags.
const DEFAULT_BACKEND_ROOT =
  process.env.DESVIACIONES_BACKEND_ROOT || path.resolve(PROJECT_ROOT, "..", "backend");

// Nombre base del APK publicado: desviaciones-vX.X.X.apk
const APK_PREFIX = "desviaciones";

// Ruta HTTP (no ruta Windows) desde donde Express sirve los APK.
const DOWNLOAD_BASE = "/updates";

// Fuente de verdad de la version nativa: es lo que realmente se compila.
const BUILD_GRADLE = path.join(PROJECT_ROOT, "android", "app", "build.gradle");

// APK que genera Gradle cuando se ejecuta assembleRelease.
const APK_SOURCE = path.join(
  PROJECT_ROOT,
  "android",
  "app",
  "build",
  "outputs",
  "apk",
  "release",
  "app-release.apk",
);

function parseArgs(argv) {
  // Valores por defecto. Se pueden cambiar pasando flags por consola.
  const args = {
    mandatory: false,
    changes: [],
    backendRoot: DEFAULT_BACKEND_ROOT,
    build: false,
    copyApk: false,
    updateBackend: true,
    auto: false,
    bump: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];

    if (arg === "--auto") {
      // Modo autonomo: lo invoca Gradle al terminar assembleRelease.
      args.auto = true;
    } else if (arg === "--bump") {
      // Sube version y versionCode para el proximo build.
      args.bump = true;
    } else if (arg === "--version") {
      args.version = next;
      i += 1;
    } else if (arg === "--code") {
      args.code = Number(next);
      i += 1;
    } else if (arg === "--mandatory") {
      args.mandatory = next === "true";
      i += 1;
    } else if (arg === "--change") {
      args.changes.push(next);
      i += 1;
    } else if (arg === "--backend") {
      args.backendRoot = next;
      i += 1;
    } else if (arg === "--build") {
      args.build = true;
    } else if (arg === "--copy-apk") {
      args.copyApk = true;
    } else if (arg === "--no-backend") {
      args.updateBackend = false;
    } else if (arg === "--help") {
      args.help = true;
    }
  }

  return args;
}

function printHelp() {
  console.log(`
Uso:
  node scripts/release-apk.js --version 1.0.3 --code 3 --change "Mejora X"

Opciones:
  --version <x.x.x>       Version nueva. Obligatorio en modo manual.
  --code <numero>         VersionCode nuevo. Obligatorio en modo manual.
  --change <texto>        Cambio visible en el changelog. Se puede repetir.
  --mandatory true|false  Actualizacion obligatoria. Default: false.
  --build                 Ejecuta gradlew assembleRelease.
  --copy-apk              Copia app-release.apk como ${APK_PREFIX}-vX.X.X.apk.
  --backend <ruta>        Ruta del backend. Default: ${DEFAULT_BACKEND_ROOT}.
  --no-backend            No actualiza desviaciones_version.json.
  --auto                  Modo autonomo (lo usa Gradle). Publica la version que
                          esta en build.gradle: copia el APK y actualiza el JSON.
  --bump                  Sube versionCode +1 y el patch de versionName en
                          build.gradle/package.json (lo usa Gradle tras el build).

Ejemplo completo:
  npm run release:apk -- --version 1.0.3 --code 3 --change "Correccion de guardado" --build --copy-apk
`);
}

function assertValidArgs(args) {
  if (args.help) return;
  if (!args.version || !/^\d+\.\d+\.\d+$/.test(args.version)) {
    throw new Error(
      "Debes indicar --version con formato x.x.x. Ejemplo: --version 1.0.3",
    );
  }
  if (!Number.isInteger(args.code) || args.code <= 0) {
    throw new Error("Debes indicar --code como numero positivo. Ejemplo: --code 3");
  }
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function readProjectVersion() {
  // Se lee de build.gradle y no de package.json porque es lo que Android
  // compila dentro del APK, y por lo tanto lo que la app reporta al arrancar.
  const gradle = fs.readFileSync(BUILD_GRADLE, "utf8");

  const version = gradle.match(/versionName\s+"([^"]+)"/);
  const code = gradle.match(/versionCode\s+(\d+)/);

  return {
    version: version ? version[1] : null,
    code: code ? Number(code[1]) : null,
  };
}

function updateProjectVersion(version, code) {
  // build.gradle, package.json y package-lock.json deben quedar con la misma
  // version para no reportar una distinta a la publicada.
  const gradle = fs.readFileSync(BUILD_GRADLE, "utf8");

  const actualizado = gradle
    .replace(/versionCode\s+\d+/, `versionCode ${code}`)
    .replace(/versionName\s+"[^"]+"/, `versionName "${version}"`);

  fs.writeFileSync(BUILD_GRADLE, actualizado, "utf8");

  const packageJsonPath = path.join(PROJECT_ROOT, "package.json");
  const packageJson = readJson(packageJsonPath);
  packageJson.version = version;
  writeJson(packageJsonPath, packageJson);

  const packageLockPath = path.join(PROJECT_ROOT, "package-lock.json");
  if (fs.existsSync(packageLockPath)) {
    const packageLock = readJson(packageLockPath);
    packageLock.version = version;
    if (packageLock.packages?.[""]) {
      packageLock.packages[""].version = version;
    }
    writeJson(packageLockPath, packageLock);
  }
}

function bumpPatch(version) {
  // Sube solo el ultimo numero: 1.0.2 -> 1.0.3.
  const parts = String(version || "1.0.0")
    .split(".")
    .map((n) => parseInt(n, 10) || 0);
  while (parts.length < 3) parts.push(0);
  parts[2] += 1;
  return parts.slice(0, 3).join(".");
}

function bumpVersion() {
  // Auto-incremento que corre DESPUES de un build release exitoso, dejando el
  // proyecto listo para el proximo build.
  const { version, code } = readProjectVersion();
  const nextCode = (Number(code) || 0) + 1;
  const nextVersion = bumpPatch(version);

  updateProjectVersion(nextVersion, nextCode);

  return {
    currentVersion: version,
    nextVersion,
    currentCode: code,
    nextCode,
  };
}

function updateBackendVersion(args) {
  // Este JSON es lo que devuelve el backend en GET /api/version.
  // La app lo consulta al iniciar para decidir si muestra el modal.
  const storageDir = path.join(args.backendRoot, "storage");
  const versionFile = path.join(storageDir, "desviaciones_version.json");
  const apkName = `${APK_PREFIX}-v${args.version}.apk`;

  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
  }

  // Preserva el changelog anterior y solo agrega/actualiza la entrada de esta
  // version, para que el modo --auto no borre el historial.
  let existing = {};
  if (fs.existsSync(versionFile)) {
    try {
      existing = readJson(versionFile);
    } catch {
      existing = {};
    }
  }

  const changelog = Array.isArray(existing.changelog) ? existing.changelog : [];
  const idx = changelog.findIndex((c) => c && c.version === args.version);
  const entry = {
    version: args.version,
    date: new Date().toISOString().slice(0, 10),
    changes:
      args.changes.length > 0
        ? args.changes
        : idx >= 0
          ? changelog[idx].changes
          : ["Cambios generales"],
  };

  if (idx >= 0) {
    changelog[idx] = entry;
  } else {
    changelog.unshift(entry);
  }

  const data = {
    version: args.version,
    versionCode: args.code,
    mandatory: args.mandatory,
    // Ruta HTTP relativa servida por Express. No usar rutas Windows aqui: la
    // app la vuelve absoluta con el host desde el que consulto la version.
    downloadUrl: `${DOWNLOAD_BASE}/${apkName}`,
    changelog,
  };

  writeJson(versionFile, data);
}

function buildApk() {
  // Compila el APK release. El resultado queda en android/app/build/outputs/apk/release.
  //
  // Se desactivan los hooks de publicacion y bump porque este script ya se
  // encarga de ambos: sin esto, un `--build` publicaria y subiria la version
  // dos veces.
  const gradle = process.platform === "win32" ? "gradlew.bat" : "./gradlew";
  const result = spawnSync(
    gradle,
    [
      "assembleRelease",
      "-Pdesviaciones.autoPublishRelease=false",
      "-Pdesviaciones.autoBumpVersionCode=false",
    ],
    {
      cwd: path.join(PROJECT_ROOT, "android"),
      stdio: "inherit",
      shell: process.platform === "win32",
    },
  );

  if (result.status !== 0) {
    throw new Error("Fallo la compilacion del APK.");
  }
}

function copyApk(args) {
  // Copia el app-release.apk generado al backend con el nombre versionado.
  if (!fs.existsSync(APK_SOURCE)) {
    throw new Error(`No existe el APK generado: ${APK_SOURCE}`);
  }

  const updatesDir = path.join(args.backendRoot, "updates");
  if (!fs.existsSync(updatesDir)) {
    fs.mkdirSync(updatesDir, { recursive: true });
  }

  const destination = path.join(updatesDir, `${APK_PREFIX}-v${args.version}.apk`);
  fs.copyFileSync(APK_SOURCE, destination);
  return destination;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  // Auto-incremento posterior al build: lo dispara Gradle una vez que el APK
  // de la version actual ya fue publicado.
  if (args.bump) {
    const r = bumpVersion();
    console.log(`[release-apk] version: ${r.currentVersion} -> ${r.nextVersion}`);
    console.log(`[release-apk] versionCode: ${r.currentCode} -> ${r.nextCode}`);
    return;
  }

  // Modo autonomo: lo dispara Gradle al terminar de ensamblar el APK release.
  // No sube versiones ni recompila; publica la version que ya esta en
  // build.gradle. Es resiliente: si el backend no es accesible solo avisa y no
  // rompe un build que ya fue exitoso.
  if (args.auto) {
    const { version, code } = readProjectVersion();
    if (!version || !Number.isInteger(code)) {
      console.warn(
        "[release-apk] build.gradle no tiene versionName/versionCode validos. Se omite la publicacion.",
      );
      return;
    }

    args.version = version;
    args.code = code;

    try {
      const destination = copyApk(args);
      console.log(`[release-apk] APK copiado: ${destination}`);
    } catch (error) {
      console.warn(`[release-apk] No se pudo copiar el APK: ${error.message}`);
    }

    if (args.updateBackend) {
      try {
        updateBackendVersion(args);
        console.log(
          `[release-apk] desviaciones_version.json actualizado -> ${version} (code ${code}).`,
        );
      } catch (error) {
        console.warn(`[release-apk] No se pudo actualizar el backend: ${error.message}`);
      }
    }

    return;
  }

  assertValidArgs(args);

  // 1. Actualiza versiones del proyecto.
  updateProjectVersion(args.version, args.code);

  // 2. Opcional: compila APK.
  if (args.build) {
    buildApk();
  }

  // 3. Opcional: copia APK al backend.
  let copiedApk = null;
  if (args.copyApk) {
    copiedApk = copyApk(args);
  }

  // 4. Actualiza el JSON que consume la app para detectar la nueva version.
  if (args.updateBackend) {
    updateBackendVersion(args);
  }

  console.log("Version actualizada correctamente.");
  console.log(`App: ${args.version}`);
  console.log(`versionCode: ${args.code}`);
  console.log(`APK esperado: ${APK_PREFIX}-v${args.version}.apk`);
  if (copiedApk) console.log(`APK copiado: ${copiedApk}`);
}

try {
  main();
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exit(1);
}
