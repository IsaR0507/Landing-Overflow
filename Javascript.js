// Overflow - medidor de profundidad, menú activo, avatares y enlace a ARCA

// ---------------------------------------------------------------
// TEXTOS EDITABLES del medidor: una marca por sección de la página.
// "seccion" es el id del <section> (o del footer), "texto" es lo que
// se lee junto a la línea y "metros" la profundidad en ese punto.
// ---------------------------------------------------------------
var profundidad = {
  marcas: [
    { seccion: "inicio",        texto: "Superficie",       metros: 0 },
    { seccion: "universo",      texto: "Zona de luz",      metros: 200 },
    { seccion: "experiencias",  texto: "Zona crepuscular", metros: 1000 },
    { seccion: "quienes-somos", texto: "Zona de medianoche", metros: 4000 },
    { seccion: "fondo",         texto: "Fondo abisal",     metros: 6000 }
  ],
  amplitud: 6,      // qué tan ancha es la ondulación (px)
  longitudOnda: 90  // cada cuántos px se repite la onda
};

// ---------------------------------------------------------------
// Elementos
// ---------------------------------------------------------------
var medidor = document.getElementById("profundidad");
var svg = document.getElementById("profundidadSvg");
var guia = document.getElementById("profundidadGuia");
var recorrido = document.getElementById("profundidadRecorrido");
var punto = document.getElementById("profundidadPunto");
var listaMarcas = document.getElementById("profundidadMarcas");
var lecturaMetros = document.getElementById("profundidadMetros");
var enlacesMenu = document.querySelectorAll(".menu__enlace");
var menu = document.querySelector(".menu");

var reducirMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)");
var ancho = 0, alto = 0;
var posiciones = [];   // dónde cae cada marca, de 0 (arriba) a 1 (abajo)

// Crea las etiquetas de las marcas una sola vez
profundidad.marcas.forEach(function (marca) {
  var li = document.createElement("li");
  li.className = "profundidad__marca";
  li.innerHTML = '<span class="profundidad__texto">' + marca.texto + '</span>' +
                 '<span class="profundidad__metros">' + marca.metros.toLocaleString("es-CO") + ' m</span>';
  listaMarcas.appendChild(li);
});
var itemsMarcas = listaMarcas.querySelectorAll(".profundidad__marca");

// ---------------------------------------------------------------
// Medidas: se recalculan al cargar y al cambiar el tamaño de pantalla
// ---------------------------------------------------------------
function medir() {
  // El medidor empieza justo debajo del menú (que cambia de alto en celular)
  document.documentElement.style.setProperty("--alto-menu", menu.offsetHeight + "px");

  ancho = medidor.clientWidth;
  alto = svg.clientHeight;
  svg.setAttribute("viewBox", "0 0 " + ancho + " " + alto);

  // Cuánto se puede bajar en total
  var recorridoTotal = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);

  // La marca de cada sección queda donde el scroll la pone arriba de la pantalla
  posiciones = profundidad.marcas.map(function (marca, i) {
    var seccion = document.getElementById(marca.seccion);
    if (!seccion || i === 0) return 0;
    var y = seccion.getBoundingClientRect().top + window.scrollY - menu.offsetHeight;
    return Math.min(1, Math.max(0, y / recorridoTotal));
  });
  posiciones[posiciones.length - 1] = 1;   // la última siempre al fondo

  itemsMarcas.forEach(function (item, i) {
    item.style.top = (posiciones[i] * 100) + "%";
  });

  dibujar();
}

// Línea ondulada vertical. La fase se mueve con el scroll, como agua.
function crearOnda(fase) {
  var centro = ancho / 2;
  var d = "";
  for (var y = 0; y <= alto; y += 4) {
    var x = centro + Math.sin((y / profundidad.longitudOnda) * Math.PI * 2 + fase) * profundidad.amplitud;
    d += (y === 0 ? "M" : "L") + x.toFixed(1) + " " + y + " ";
  }
  return d;
}

// Convierte el avance (0 a 1) en metros, interpolando entre marcas
function metrosEn(avance) {
  var marcas = profundidad.marcas;
  for (var i = 1; i < marcas.length; i++) {
    if (avance <= posiciones[i]) {
      var tramo = posiciones[i] - posiciones[i - 1] || 1;
      var t = (avance - posiciones[i - 1]) / tramo;
      return marcas[i - 1].metros + t * (marcas[i].metros - marcas[i - 1].metros);
    }
  }
  return marcas[marcas.length - 1].metros;
}

// ---------------------------------------------------------------
// Dibujo: se llama cada vez que la persona hace scroll
// ---------------------------------------------------------------
function dibujar() {
  if (!alto) return;
  var recorridoTotal = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  var avance = Math.min(1, Math.max(0, window.scrollY / recorridoTotal));

  // Si la persona pidió menos movimiento, la onda se queda quieta
  var fase = reducirMovimiento.matches ? 0 : window.scrollY / 160;
  var d = crearOnda(fase);
  guia.setAttribute("d", d);
  recorrido.setAttribute("d", d);

  // La parte recorrida se "llena" con un trazo del largo justo
  var largo = recorrido.getTotalLength();
  recorrido.style.strokeDasharray = largo;
  recorrido.style.strokeDashoffset = largo * (1 - avance);

  // El punto marca dónde vas
  var p = recorrido.getPointAtLength(largo * avance);
  punto.setAttribute("cx", p.x);
  punto.setAttribute("cy", p.y);

  lecturaMetros.textContent = Math.round(metrosEn(avance)).toLocaleString("es-CO");

  // Marca actual: la última que ya pasaste
  var actual = 0;
  posiciones.forEach(function (pos, i) { if (avance >= pos - 0.001) actual = i; });
  itemsMarcas.forEach(function (item, i) {
    item.classList.toggle("profundidad__marca--pasada", i <= actual);
    item.classList.toggle("profundidad__marca--actual", i === actual);
  });
  marcarMenu(profundidad.marcas[actual].seccion);
}

// El enlace del menú se ilumina según la sección en la que estás
function marcarMenu(idSeccion) {
  // Si la sección no está en el menú (el pie de página), se deja como estaba
  if (!document.querySelector('.menu__enlace[href="#' + idSeccion + '"]')) return;
  enlacesMenu.forEach(function (enlace) {
    var activo = enlace.getAttribute("href") === "#" + idSeccion;
    enlace.classList.toggle("menu__enlace--activo", activo);
    if (activo) enlace.setAttribute("aria-current", "page");
    else enlace.removeAttribute("aria-current");
  });
}

// requestAnimationFrame: dibuja como máximo una vez por cuadro, así no se traba
var pendiente = false;
window.addEventListener("scroll", function () {
  if (pendiente) return;
  pendiente = true;
  requestAnimationFrame(function () { pendiente = false; dibujar(); });
}, { passive: true });

window.addEventListener("resize", medir);
window.addEventListener("load", medir);   // otra vez cuando cargan imágenes y fuentes
medir();

// ---------------------------------------------------------------
// Avatares SVG del equipo
// Lee el nombre de cada .persona y dibuja dentro de su círculo un avatar:
// sus iniciales "sumergidas" y el agua a una altura distinta para cada
// integrante (la altura sale del nombre, así siempre es la misma).
//
// Si a alguien le quieres poner foto real, pon un <img> dentro de su
// .persona__foto y este script lo deja quieto.
// ---------------------------------------------------------------
(function () {
  var colores = {
    cielo: "#0f4350",      // fondo, arriba del agua
    agua: "#055a74",       // primera capa de agua
    aguaHonda: "#02303d",  // capa más profunda
    linea: "#9cc7c2",      // borde de la ola (igual que las ondas de ARCA)
    texto: "#f6ede0"       // crema de las iniciales
  };

  // "Sebastian Pérez Henao" -> "SP", "Nathalia" -> "N"
  function iniciales(nombre) {
    var partes = nombre.trim().split(/\s+/);
    return ((partes[0] || "").charAt(0) + (partes[1] || "").charAt(0)).toUpperCase();
  }

  // Convierte el nombre en un número de 0 a 1, siempre igual para el mismo nombre
  function semilla(texto) {
    var h = 7;
    for (var i = 0; i < texto.length; i++) h = (h * 31 + texto.charCodeAt(i)) % 9973;
    return h / 9973;
  }

  // Ola: "cerrada" rellena hacia abajo; si no, solo la línea de la superficie
  function ola(nivel, fase, amplitud, cerrada) {
    var d = "";
    for (var x = 0; x <= 100; x += 4) {
      var y = nivel + Math.sin((x / 100) * Math.PI * 3 + fase) * amplitud;
      d += (x === 0 ? "M" : " L") + x + " " + y.toFixed(1);
    }
    return cerrada ? d + " L100 100 L0 100 Z" : d;
  }

  function crearAvatar(nombre) {
    var s = semilla(nombre);
    var nivel = 54 + s * 12;        // altura del agua: entre 54 y 66
    var fase = s * Math.PI * 2;     // en qué punto arranca la ola

    // Tres burbujas bajo el agua, en posiciones que también salen del nombre
    var burbujas = "";
    for (var b = 0; b < 3; b++) {
      var bx = 18 + ((s * 97 + b * 29) % 64);
      var by = nivel + 12 + b * 8;
      burbujas += '<circle cx="' + bx.toFixed(1) + '" cy="' + by.toFixed(1) + '" r="' + (1.2 + b * 0.5) +
        '" fill="none" stroke="' + colores.texto + '" stroke-opacity="0.45" stroke-width="0.8"/>';
    }

    return '<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">' +
      '<rect width="100" height="100" fill="' + colores.cielo + '"/>' +
      '<text x="50" y="44" text-anchor="middle" dominant-baseline="middle" ' +
        'font-family="Roboto Mono, monospace" font-weight="700" font-size="34" letter-spacing="1" ' +
        'fill="' + colores.texto + '">' + iniciales(nombre) + '</text>' +
      // El agua va encima de las letras, semitransparente: se ven "hundidas"
      '<path d="' + ola(nivel, fase, 3, true) + '" fill="' + colores.agua + '" fill-opacity="0.62"/>' +
      '<path d="' + ola(nivel + 13, fase + 1.7, 2.4, true) + '" fill="' + colores.aguaHonda + '" fill-opacity="0.9"/>' +
      '<path d="' + ola(nivel, fase, 3, false) + '" fill="none" stroke="' + colores.linea + '" stroke-width="1.4" stroke-linecap="round"/>' +
      burbujas +
    '</svg>';
  }

  document.querySelectorAll(".persona").forEach(function (persona) {
    var foto = persona.querySelector(".persona__foto");
    var nombre = persona.querySelector(".persona__nombre");
    if (!foto || !nombre || foto.querySelector("img")) return;
    var texto = nombre.textContent.trim();
    foto.innerHTML = crearAvatar(texto);
    foto.setAttribute("aria-label", "Avatar de " + texto);
  });
})();

// ---------------------------------------------------------------
// Proyecto ARCA se abre por código: así, al terminar su animación,
// el navegador sí la deja cerrar la pestaña sola
// ---------------------------------------------------------------
var botonArca = document.getElementById("abrirArca");
if (botonArca) {
  botonArca.addEventListener("click", function (evento) {
    evento.preventDefault();
    window.open(this.href, "_blank");
  });
}