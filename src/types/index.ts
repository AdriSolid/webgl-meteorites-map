export interface CartoFetchData {
  apiKey?: string;
  sql: string;
  user: string;
}

export interface Decode extends CartoFetchData {
  dataField: string;
  pullToRight?: boolean;
  type: string;
}

export type Feature = number[];

export type DataState = {
  data: Feature;
  geometry: Feature;
};

export type MapConfig = {
  version?: string;
  buffersize?: {
    mvt: number;
  };
  layers: [
    {
      type: string;
      options: {
        sql: string;
        vector_extent?: number;
      };
    },
  ];
};

export type Point = {
  x: number;
  y: number;
};

export type ResizeState = [number, number];
