# Graficador de datos

Herramienta web que genera gráficos y estadísticas descriptivas a partir de los datos que le pases. Funciona en el navegador, sin servidor ni instalación.

## Uso

Abre `index.html` en el navegador y pasa tus datos de cualquiera de estas formas:

- **Pegar texto:** `Semana 1 - 23`, o líneas separadas por comas, punto y coma o tabulaciones. Con varias series, usa una primera fila de títulos (`Mes, Ventas, Gastos`).
- **Tabla:** escribe directamente en una cuadrícula y agrega filas o series.
- **Archivo:** CSV, TXT, XLSX o XLS (se usa la primera hoja). También se puede arrastrar.

## Qué genera

Según los datos, la herramienta muestra solo los gráficos que tienen sentido:

- Barras, líneas y dona
- Barras apiladas y dispersión (con varias series)
- Histograma con polígono de frecuencias y frecuencia acumulada
- Diagrama de caja y bigotes
- Tabla de frecuencias (absoluta, relativa y acumulada)
- Tabla de estadísticos: media, mediana, moda, rango, cuartiles, rango intercuartílico, varianza, desviación estándar, coeficiente de variación, asimetría y valores atípicos

Los colores se pueden cambiar desde la franja "Colores de las gráficas", y cada gráfica se descarga como PNG. También puedes escribir un título y el nombre de los ejes X e Y; aparecen dentro de la gráfica y quedan en la imagen descargada.

## Archivos

| Archivo | Contenido |
| --- | --- |
| `index.html` | Estructura de la página |
| `estilos.css` | Estilos |
| `app.js` | Lectura de datos, estadísticas y gráficos |
| `lib/` | Librerías incluidas: Chart.js 4.4.1 y SheetJS 0.18.5 |
| `fonts/` | Tipografías Bricolage Grotesque e Instrument Sans |
| `licencias/` | Licencias de las librerías y tipografías |

## Dependencias

Todo está incluido en el repositorio, así que la herramienta funciona sin conexión a internet:

- [Chart.js](https://www.chartjs.org/) 4.4.1 (licencia MIT)
- [SheetJS](https://sheetjs.com/) 0.18.5 (licencia Apache 2.0), para leer archivos Excel
- Tipografías Bricolage Grotesque e Instrument Sans (licencia SIL OFL)

## Notas

Los cuartiles se calculan por interpolación lineal, igual que `QUARTILE.INC` de Excel. Los valores atípicos son los que quedan fuera de 1,5 veces el rango intercuartílico a partir de Q1 y Q3.
