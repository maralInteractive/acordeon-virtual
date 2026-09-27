# Acordeón Virtual

Un acordeón interactivo que suena de verdad, hecho solo con HTML5, CSS3 y JavaScript vanilla. No usa muestras de audio ni librerías externas: cada nota se sintetiza en tiempo real con la Web Audio API, combinando dos osciladores ligeramente desafinados para imitar el timbre "musette" de las lengüetas dobles de un acordeón real.

Se puede tocar con el mouse, con el teclado físico o con los dedos en una pantalla táctil (incluyendo varios dedos a la vez), deslizando de un botón a otro sin soltar.

## Estructura del proyecto

```
.
├── index.html    # Estructura semántica y accesible de la interfaz
├── styles.css    # Estilos, tema visual y animación del fuelle
├── script.js     # Motor de audio, mapeo de teclado y eventos táctiles
└── README.md
```

## Mapa de controles

### Mano derecha — melodía

Dos filas superpuestas: la fila superior suena una octava más aguda que la inferior, con la misma disposición de notas.

| Tecla | Q   | W   | E   | R   | T   | Y   | U   | I   | O   | P   |
|-------|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|
| Nota  | Do5 | Re5 | Mi5 | Fa5 | Sol5| La5 | Si5 | Do6 | Re6 | Mi6 |

| Tecla | A   | S   | D   | F   | G   | H   | J   | K   | L   |
|-------|-----|-----|-----|-----|-----|-----|-----|-----|-----|
| Nota  | Do4 | Re4 | Mi4 | Fa4 | Sol4| La4 | Si4 | Do5 | Re5 |

### Mano izquierda — bajos y acordes

| Tecla | 1        | 2        | 3        | 4        | 5        | 6       | 7               |
|-------|----------|----------|----------|----------|----------|---------|-----------------|
| Acorde| Do Mayor | Re menor | Mi menor | Fa Mayor | Sol Mayor| La menor| Si disminuido   |

| Tecla | Z   | X   | C   | V   | B   | N   | M   |
|-------|-----|-----|-----|-----|-----|-----|-----|
| Bajo  | Do2 | Re2 | Mi2 | Fa2 | Sol2| La2 | Si2 |

### Otros controles

- **Volumen**: control deslizante en la parte superior.
- **Octava − / +**: transporta todo el instrumento hasta dos octavas hacia abajo o hacia arriba.
- **Silenciar todo**: corta cualquier nota que haya quedado sonando (también se activa solo si la pestaña pierde el foco).

Todos los mapeos también están disponibles en el desplegable **"Mapa completo de teclado"** dentro de la propia página.

## Cómo funciona el audio

Por cada nota presionada, `script.js` crea dos osciladores tipo `sawtooth` (uno afinado y otro desviado unos cents), los pasa por un filtro pasa-bajos y les aplica una envolvente de ganancia con ataque rápido y una breve caída al soltar, todo generado en el momento con la Web Audio API — no hay ningún archivo de audio de por medio. El `AudioContext` se crea recién en la primera interacción del usuario, como exigen las políticas de autoplay de los navegadores.

## Ejecutar en local

No requiere instalación ni build. Alcanza con abrir `index.html` en un navegador moderno, o servir la carpeta con cualquier servidor estático, por ejemplo:

```bash
npx serve .
```

## Publicar en GitHub Pages

1. Creá un repositorio nuevo en GitHub (por ejemplo `acordeon-virtual`).
2. Subí los cuatro archivos de este proyecto a la raíz del repositorio:

   ```bash
   git init
   git add index.html styles.css script.js README.md
   git commit -m "Acordeón virtual interactivo"
   git branch -M main
   git remote add origin https://github.com/<tu-usuario>/<tu-repositorio>.git
   git push -u origin main
   ```

3. En GitHub, entrá a **Settings → Pages**.
4. En **Source**, elegí la rama `main` y la carpeta `/ (root)`.
5. Guardá los cambios. GitHub va a publicar el sitio en unos minutos en:

   ```
   https://<tu-usuario>.github.io/<tu-repositorio>/
   ```

## Compatibilidad

Funciona en cualquier navegador moderno con soporte de Web Audio API y Pointer Events (Chrome, Firefox, Safari y Edge actuales, tanto en escritorio como en dispositivos móviles).
