package com.fisholg.desviaciones;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

@CapacitorPlugin(name = "AppUpdate")
public class AppUpdatePlugin extends Plugin {

    private static final String CARPETA_DESCARGAS = "updates";
    private static final String APK_LOCAL = "desviaciones-update.apk";

    // --- HABILITAR INSTALACION DE APPS DESCONOCIDOS ---
    private static class SinPermisoInstalacion extends Exception {
        SinPermisoInstalacion(String mensaje) {
            super(mensaje);
        }
    }

    @PluginMethod
    public void descargarEInstalar(PluginCall call) {
        String url = call.getString("url");

        if (url == null || url.trim().isEmpty()) {
            call.reject("Falta la url del APK");
            return;
        }

        if (!url.startsWith("http://") && !url.startsWith("https://")) {
            call.reject("URL de descarga invalida: " + url);
            return;
        }
        new Thread(() -> {
            try {
                File apk = descargar(url);
                instalar(apk);

                JSObject respuesta = new JSObject();
                respuesta.put("instaladorAbierto", true);
                call.resolve(respuesta);
            } catch (SinPermisoInstalacion e) {
                abrirAjustesOrigenesDesconocidos();
                call.reject(e.getMessage());
            } catch (Exception e) {
                call.reject(e.getMessage() != null ? e.getMessage() : e.toString());
            }
        }).start();
    }

    private File descargar(String urlApk) throws Exception {
        File carpeta = new File(getContext().getCacheDir(), CARPETA_DESCARGAS);
        if (!carpeta.exists() && !carpeta.mkdirs()) {
            throw new Exception("No se pudo crear la carpeta de descargas");
        }

        // Se descarga siempre de cero: un APK a medio bajar de un intento anterior se instalaria corrupto.
        File destino = new File(carpeta, APK_LOCAL);
        if (destino.exists() && !destino.delete()) {
            throw new Exception("No se pudo borrar la descarga anterior");
        }

        HttpURLConnection conexion = (HttpURLConnection) new URL(urlApk).openConnection();
        conexion.setConnectTimeout(15000);
        conexion.setReadTimeout(30000);
        conexion.setInstanceFollowRedirects(true);

        try {
            conexion.connect();

            int codigo = conexion.getResponseCode();
            if (codigo != HttpURLConnection.HTTP_OK) {
                throw new Exception("El servidor respondio " + codigo + " al descargar el APK");
            }

            long total = conexion.getContentLengthLong();
            long escrito = 0;
            int ultimoPorcentaje = -1;

            try (InputStream entrada = conexion.getInputStream();
                 FileOutputStream salida = new FileOutputStream(destino)) {

                byte[] buffer = new byte[8192];
                int leidos;

                while ((leidos = entrada.read(buffer)) != -1) {
                    salida.write(buffer, 0, leidos);
                    escrito += leidos;

                    if (total <= 0) continue;

                    int porcentaje = (int) (escrito * 100 / total);

                    if (porcentaje != ultimoPorcentaje) {
                        ultimoPorcentaje = porcentaje;

                        JSObject evento = new JSObject();
                        evento.put("porcentaje", porcentaje);
                        evento.put("descargado", escrito);
                        evento.put("total", total);
                        notifyListeners("progresoDescarga", evento);
                    }
                }
            }
        } finally {
            conexion.disconnect();
        }

        if (destino.length() == 0) {
            throw new Exception("La descarga quedo vacia");
        }

        return destino;
    }

    private void instalar(File apk) throws Exception {
        Context contexto = getContext();

        // ----- CONTROL DE VERSIONES DESDE ANDROID 8 -----
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                && !contexto.getPackageManager().canRequestPackageInstalls()) {
            throw new SinPermisoInstalacion(
                "Habilita 'Instalar apps desconocidas' para Desviaciones y vuelve a intentar."
            );
        }

        // ----- PERMISOS DE INSTALACION -----
        Uri uri = FileProvider.getUriForFile(
            contexto,
            contexto.getPackageName() + ".fileprovider",
            apk
        );

        // ----- PERMISOS DE INSTALACION -----
        Intent intent = new Intent(Intent.ACTION_VIEW);
        intent.setDataAndType(uri, "application/vnd.android.package-archive");
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
        contexto.startActivity(intent);
    }

    private void abrirAjustesOrigenesDesconocidos() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;

        try {
            Context contexto = getContext();
            Intent intent = new Intent(
                Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                Uri.parse("package:" + contexto.getPackageName())
            );
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            contexto.startActivity(intent);
        } catch (Exception ignorada) {
       
        }
    }
}
