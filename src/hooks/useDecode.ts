import { useState, useEffect, useCallback } from "react";
import Pbf from "pbf";
import { VectorTile } from "@mapbox/vector-tile";
import { CartoFetchData, Decode, DataState, Feature, MapConfig, Point } from "../types";

const DEFAULT_API_KEY = "default_public";

const VECTOR_EXTENT = 4096;

function getMapConfig(sql: string): MapConfig {
  return {
    version: "1.3.1",
    buffersize: { mvt: 1 },
    layers: [
      {
        type: "mapnik",
        options: {
          sql,
          vector_extent: VECTOR_EXTENT,
        },
      },
    ],
  };
}

function tileCoords(url: string): string {
  if (url) {
    return url.replace("{x}", "0").replace("{y}", "0").replace("{z}", "0");
  }

  return "";
}

async function getData({ user, apiKey, sql }: CartoFetchData): Promise<string> {
  try {
    const response = await fetch(`https://${user}.carto.com/api/v1/map?api_key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(getMapConfig(sql)),
    });

    const { metadata } = await response.json();

    return metadata.tilejson.vector.tiles[0];
  } catch (err) {
    throw new Error(err);
  }
}

function useDecode({ sql, user, dataField, type, pullToRight = false, apiKey = DEFAULT_API_KEY }: Decode): DataState {
  const [info, setInfo] = useState<DataState>({
    geometry: [],
    data: [],
  });

  const load = useCallback(
    (layer): void => {
      const geometry = [];
      const data = [];

      const xPos = pullToRight ? 0 : 1;

      for (let i = 0; i < layer.length; i++) {
        const feature = layer.feature(i);
        const geom = feature.loadGeometry();

        if (type === "point") {
          const point = geom[0][0];
          geometry.push((1 * point.x) / VECTOR_EXTENT - xPos, (-2 * point.y) / VECTOR_EXTENT + 1);
          data.push(feature.properties[dataField]);
        }

        if (type === "line") {
          geom.forEach((f: []): void => {
            const part = f.map(
              (a: Point): Feature => [(1 * a.x) / VECTOR_EXTENT - xPos, (-2 * a.y) / VECTOR_EXTENT + 1],
            );
            geometry.push(part);
          });
          data.push(feature.properties[dataField]);
        }
      }

      setInfo({
        geometry,
        data,
      });
    },
    [setInfo],
  );

  useEffect((): void => {
    (async (): Promise<void> => {
      try {
        const tileUrl = getData({ user, apiKey, sql });
        const targetTile = tileCoords(await tileUrl);
        const rawData = await fetch(targetTile);
        const response = await rawData.arrayBuffer();
        const { layers } = new VectorTile(new Pbf(response));
        load(layers.layer0);
      } catch (err) {
        throw new Error(err);
      }
    })();
  }, []);

  return info;
}

export default useDecode;
