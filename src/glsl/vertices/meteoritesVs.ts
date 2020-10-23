export const meteoritesVs: string = `
  precision highp float;
  attribute vec2 vertexPos;
  attribute float data;

  void main(){
    gl_Position = vec4(vertexPos, .5, 1);
    gl_PointSize = sqrt(data) / 12.;
  }
`;
