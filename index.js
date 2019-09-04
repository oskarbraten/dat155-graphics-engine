
/**
 * A simple WebGL2 graphics engine.
 */

export { default as Renderer } from './src/Renderer.js';
export { default as Node } from './src/Node.js';
export { default as Scene } from './src/Scene.js';
export { default as Mesh } from './src/mesh/Mesh.js';
export { default as Light } from './src/light/Light.js';

export { default as BasicMaterial } from './src/materials/BasicMaterial.js';
export { default as CubeMapMaterial } from './src/materials/CubeMapMaterial.js';

export { default as PerspectiveCamera } from './src/camera/PerspectiveCamera.js';

import { default as createPlane } from './src/primitives/createPlane.js';
import { default as createBox } from './src/primitives/createBox.js';

export const Primitives = { createPlane, createBox };

export {
    glMatrix,
    mat2, mat2d, mat3, mat4,
    quat, quat2,
    vec2, vec3, vec4,
} from './lib/gl-matrix/src/index.js';