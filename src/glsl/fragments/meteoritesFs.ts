export const meteoritesFs: string = `
  precision highp float;
    
  void main(){
    float p = length(gl_PointCoord - .5);
    float r = .5;
    gl_FragColor = vec4(1, .7, .2, .2 * step(p, r));
  }
`;
