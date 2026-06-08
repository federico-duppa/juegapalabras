// Analítica ELIMINADA. Este objeto es un no-op: no carga ningún proveedor, no hace
// pedidos de red, no usa cookies y no recopila ni envía ningún dato. Existe solo para
// que las llamadas Analytics.init()/track()/catOf() que quedan en el código no rompan.
// (El sitio no recopila datos: ni en la web ni en la app.)
const Analytics = {
  init() {},
  track() {},
  pageview() {},
  catOf() { return "?"; },
};
