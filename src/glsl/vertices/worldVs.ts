export const worldVs: string = `
  precision highp float;
  attribute vec2 vertexPos;

  void main(){
    gl_Position = vec4(vertexPos, .5, 1);
  }
`;
