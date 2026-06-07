// Registro del Service Worker + auto-actualización.
// Se incluye en todas las páginas. sw.js vive en la raíz; lo resolvemos relativo a ESTE
// script (que está en <raíz>/js/), así el mismo archivo sirve desde cualquier subcarpeta.
(function () {
  if (!("serviceWorker" in navigator)) return;

  // Capturado sincrónicamente: document.currentScript ya no existe dentro de callbacks.
  var swUrl = new URL("../sw.js", document.currentScript.src).href;

  // ¿La página ya estaba controlada por un SW al cargar? Si NO (primera visita), el
  // clients.claim() del primer SW dispara un controllerchange que NO debe recargar.
  var hadController = !!navigator.serviceWorker.controller;
  var reloading = false;

  // Cuando un SW nuevo toma el control (tras skipWaiting + claim en sw.js), recargamos
  // una sola vez para usar los assets nuevos. Esto es lo que hace la actualización automática.
  navigator.serviceWorker.addEventListener("controllerchange", function () {
    if (!hadController || reloading) return;
    reloading = true;
    window.location.reload();
  });

  window.addEventListener("load", function () {
    navigator.serviceWorker.register(swUrl, { updateViaCache: "none" }).then(function (reg) {
      // Buscar una versión nueva cada vez que la app vuelve a primer plano (una PWA puede
      // quedar abierta días; sin esto no se enteraría de un deploy hasta navegar o ~24h).
      document.addEventListener("visibilitychange", function () {
        if (document.visibilityState === "visible") reg.update();
      });
    }).catch(function () {});
  });
})();
