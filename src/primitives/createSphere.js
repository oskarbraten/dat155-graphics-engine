
import { vec3, vec2 } from '../../lib/gl-matrix/src/index.js';
import { COMPONENT } from '../constants.js';
import { getMinMax } from './common.js';

import BufferView from '../mesh/BufferView.js';
import Accessor from '../mesh/Accessor.js';
import Primitive from '../mesh/Primitive.js';

const isLittleEndian = new Uint8Array(new Uint32Array([0x12345678]).buffer)[0] === 0x78;

/**
 * Converts spherical coordinates to cartesian.
 * @param {float} theta 
 * @param {float} phi 
 */
function sphericalToCartesian(theta, phi) {
    return vec3.fromValues(
        Math.sin(theta) * Math.cos(phi),
        Math.sin(theta) * Math.sin(phi),
        Math.cos(theta)
    );
}

function swapYZ(v) {
    let z = v[2];
    v[2] = v[1];
    v[1] = z;
    return v;
}

/**
 * Generates a box, and returns a primitive.
 * 
 * @param {segments} number of vertical segments
 * @param {rings} number of horizontal rings
 * @param {Material} material 
 * @param {integer} mode 
 * @param {boolean} [flipNormals=false]
 * @returns {Primitive}
 */
export default (material, numLatitudeLines = 32, numLongitudeLines = 32, mode) => {

    const vertices = [];
    const uvs = [];
    const normals = [];

    for (let t = 0; t < numLatitudeLines; t++) {

        let theta1 = (t / numLatitudeLines) * Math.PI;
        let theta2 = ((t + 1) / numLatitudeLines) * Math.PI;

        for (let p = 0; p < numLongitudeLines; p++) {

            let phi1 = (p / numLongitudeLines) * 2 * Math.PI;
            let phi2 = ((p + 1) / numLongitudeLines) * 2 * Math.PI;

            //phi2   phi1
            // |      |
            // 2------1 -- theta1
            // |\ _   |
            // |    \ |
            // 3------4 -- theta2

            const vertex1 = swapYZ(sphericalToCartesian(theta1, phi1));
            const vertex2 = swapYZ(sphericalToCartesian(theta1, phi2));
            const vertex3 = swapYZ(sphericalToCartesian(theta2, phi2));
            const vertex4 = swapYZ(sphericalToCartesian(theta2, phi1));

            const uv1 = vec2.fromValues(p / numLongitudeLines, t / numLatitudeLines);
            const uv2 = vec2.fromValues((p + 1) / numLongitudeLines, t / numLatitudeLines);
            const uv3 = vec2.fromValues((p + 1) / numLongitudeLines, (t + 1) / numLatitudeLines);
            const uv4 = vec2.fromValues(p / numLongitudeLines, (t + 1)  / numLatitudeLines);

            const normal1 = vec3.normalize(vec3.create(), vertex1);
            const normal2 = vec3.normalize(vec3.create(), vertex2);
            const normal3 = vec3.normalize(vec3.create(), vertex3);
            const normal4 = vec3.normalize(vec3.create(), vertex4);

            if (t == 0) {
                vertices.push(...vertex1, ...vertex3, ...vertex4);
                uvs.push(...uv1, ...uv3, ...uv4);
                normals.push(...normal1, ...normal3, ...normal4);
            } else if (t + 1 == numLatitudeLines) {
                vertices.push(...vertex3, ...vertex1, ...vertex2);
                uvs.push(...uv3, ...uv1, ...uv2);
                normals.push(...normal3, ...normal1, ...normal2);
            } else {
                vertices.push(...vertex1, ...vertex2, ...vertex4);
                vertices.push(...vertex2, ...vertex3, ...vertex4);

                uvs.push(...uv1, ...uv2, ...uv4);
                uvs.push(...uv2, ...uv3, ...uv4);

                normals.push(...normal1, ...normal2, ...normal4);
                normals.push(...normal2, ...normal3, ...normal4);
            }
        }
    }

    const attributeBuffer = new ArrayBuffer(vertices.length * 4 + normals.length * 4 + uvs.length * 4); // 4, as in 4 bytes per element.
    const dataView = new DataView(attributeBuffer);

    // copy over vertices.
    for (let i = 0; i < vertices.length; i++) {
        dataView.setFloat32(i * 4, vertices[i], isLittleEndian);
    }

    // copy over normals.
    for (let i = 0; i < normals.length; i++) {
        dataView.setFloat32((vertices.length + i) * 4, normals[i], isLittleEndian);
    }

    // copy over uvs.
    for (let i = 0; i < uvs.length; i++) {
        dataView.setFloat32((vertices.length + normals.length + i) * 4, uvs[i], isLittleEndian);
    }

    const bufferView = new BufferView(attributeBuffer);

    let { min, max } = getMinMax(vertices); // Get the bounding box.

    const attributes = {
        POSITION: new Accessor(bufferView, COMPONENT.TYPE.FLOAT, 'VEC3', vertices.length, 0, min, max),
        NORMAL: new Accessor(bufferView, COMPONENT.TYPE.FLOAT, 'VEC3', normals.length, vertices.length * 4),
        TEXCOORD_0: new Accessor(bufferView, COMPONENT.TYPE.FLOAT, 'VEC2', uvs.length, vertices.length * 4 + normals.length * 4)
    };

    return new Primitive(attributes, material, null, mode);

};