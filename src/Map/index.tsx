import React, { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { useDecode, useWindowSize } from "../hooks";
import { meteoritesFs, worldFs } from "../glsl/fragments";
import { meteoritesVs, worldVs } from "../glsl/vertices";
import { DataState } from "../types";
import "./style.css";

const CONTEXT = "webgl";

const DOTGIS_USER = "dotgis";
const CARTO_USER = "cartovl";

const POLAR_PROJECTION = "ST_Transform(the_geom_webmercator, 3575)";

const QUERIES = {
  CN: "SELECT cartodb_id, the_geom_webmercator FROM countries_110m_admin_0",
  POLAR_CN: `SELECT cartodb_id, ${POLAR_PROJECTION} AS the_geom_webmercator FROM countries_110m_admin_0`,
  METEO: `SELECT cartodb_id, the_geom_webmercator, mass FROM meteorites WHERE mass IS NOT NULL ORDER BY mass DESC`,
  POLAR_METEO: `SELECT cartodb_id, ${POLAR_PROJECTION}  AS the_geom_webmercator, mass FROM meteorites WHERE mass IS NOT NULL ORDER BY mass DESC`,
};

function Map(): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gl, setGl] = useState<WebGLRenderingContext | null>(null);
  const [screenWidth, screenHeight] = useWindowSize();

  const meteorites = useDecode({ sql: QUERIES.METEO, user: DOTGIS_USER, dataField: "mass", type: "point" });

  const meteoritesPolar = useDecode({
    sql: QUERIES.POLAR_METEO,
    user: DOTGIS_USER,
    dataField: "mass",
    type: "point",
    pullToRight: true,
  });

  const countries = useDecode({ sql: QUERIES.CN, user: CARTO_USER, dataField: "cartodb_id", type: "line" });

  const countriesPolar = useDecode({
    sql: QUERIES.POLAR_CN,
    user: CARTO_USER,
    dataField: "cartodb_id",
    type: "line",
    pullToRight: true,
  });

  useEffect((): void => {
    if (canvasRef.current) {
      setGl(canvasRef.current.getContext(CONTEXT));
    }
  }, [canvasRef]);

  const createProgram = useCallback(
    (vertexShaderGLSL, fragmentShaderGLSL): WebGLProgram => {
      if (gl) {
        const program = gl.createProgram() as WebGLProgram;
        gl.attachShader(program, compileShader(vertexShaderGLSL, gl.VERTEX_SHADER) as WebGLShader);
        gl.attachShader(program, compileShader(fragmentShaderGLSL, gl.FRAGMENT_SHADER) as WebGLShader);
        gl.linkProgram(program);

        const success = gl.getProgramParameter(program, gl.LINK_STATUS);
        if (!success) throw gl.getProgramInfoLog(program);

        return program;
      }

      throw new Error("GL was not initialized");
    },
    [gl],
  );

  const compileShader = useCallback(
    (glsl, shaderType): WebGLShader => {
      if (gl) {
        const shader = gl.createShader(shaderType) as WebGLShader;
        gl.shaderSource(shader, glsl);
        gl.compileShader(shader);

        const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
        if (!success) throw gl.getShaderInfoLog(shader);

        return shader;
      }

      throw new Error("GL was not initialized");
    },
    [gl],
  );

  const render = useCallback(
    (geometry, data, vs, fs, type): void => {
      if (gl) {
        const program = createProgram(vs, fs) as WebGLProgram;

        if (type === "line") {
          for (const g of geometry) {
            const vertexBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(g.flatMap((a: number) => a)), gl.STATIC_DRAW);

            const vertexAttribute = gl.getAttribLocation(program, "vertexPos");
            gl.enableVertexAttribArray(vertexAttribute);
            gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
            gl.vertexAttribPointer(vertexAttribute, 2, gl.FLOAT, false, 0, 0);

            gl.useProgram(program);
            gl.drawArrays(gl.LINE_STRIP, 0, g.length);
          }
        }

        if (type === "point") {
          const vertexBuffer = gl.createBuffer();
          gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
          gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(geometry), gl.STATIC_DRAW);

          const dataBuffer = gl.createBuffer();
          gl.bindBuffer(gl.ARRAY_BUFFER, dataBuffer);
          gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);

          const vertexAttribute = gl.getAttribLocation(program, "vertexPos");
          gl.enableVertexAttribArray(vertexAttribute);
          gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
          gl.vertexAttribPointer(vertexAttribute, 2, gl.FLOAT, false, 0, 0);

          const dataAttribute = gl.getAttribLocation(program, "data");
          gl.enableVertexAttribArray(dataAttribute);
          gl.bindBuffer(gl.ARRAY_BUFFER, dataBuffer);
          gl.vertexAttribPointer(dataAttribute, 1, gl.FLOAT, false, 0, 0);

          gl.useProgram(program);
          gl.drawArrays(gl.POINTS, 0, geometry.length / 2);
        }
      }
    },
    [gl],
  );

  useEffect((): void => {
    const { geometry: g1, data: d1 } = meteorites as DataState;
    const { geometry: g12, data: d12 } = meteoritesPolar as DataState;
    const { geometry: g2, data: d2 } = countries as DataState;
    const { geometry: g22, data: d22 } = countriesPolar as DataState;

    if (g1 && g12 && g2 && g22 && d1 && d12 && d2 && d22 && gl) {
      if (canvasRef.current) {
        canvasRef.current.width = screenWidth;
        canvasRef.current.height = screenHeight;
      }

      gl.viewport(0, 0, screenWidth, screenHeight);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

      render(g2, d2, worldVs, worldFs, "line");
      render(g1, d1, meteoritesVs, meteoritesFs, "point");
      render(g22, d22, worldVs, worldFs, "line");
      render(g12, d12, meteoritesVs, meteoritesFs, "point");
    }
  }, [meteorites, meteoritesPolar, countries, countriesPolar, gl, screenWidth, screenHeight]);

  return <canvas ref={canvasRef}></canvas>;
}

export default Map;
