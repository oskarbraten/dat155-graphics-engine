
import { vec3, vec2 } from '../../lib/gl-matrix/src/index.js';
import { COMPONENT } from '../constants.js';
import { getMinMax } from './common.js';

import BufferView from '../mesh/BufferView.js';
import Accessor from '../mesh/Accessor.js';
import Primitive from '../mesh/Primitive.js';

const isLittleEndian = new Uint8Array(new Uint32Array([0x12345678]).buffer)[0] === 0x78;

function sphericalToCartesian(theta, phi) {
    return vec3.fromValues(
        Math.sin(theta) * Math.cos(phi),
        Math.sin(theta) * Math.sin(phi),
        Math.cos(theta)
    );
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
export default (material, numLatitudeLines = 24, numLongitudeLines = 24, radius = 1, flipNormals = false, mode) => {

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

            const vertex1 = sphericalToCartesian(theta1, phi1);
            const vertex2 = sphericalToCartesian(theta1, phi2);
            const vertex3 = sphericalToCartesian(theta2, phi2);
            const vertex4 = sphericalToCartesian(theta2, phi1);

            const normal1 = vec3.normalize(vec3.create(), vertex1);
            const normal2 = vec3.normalize(vec3.create(), vertex2);
            const normal3 = vec3.normalize(vec3.create(), vertex3);
            const normal4 = vec3.normalize(vec3.create(), vertex4);

            if (t == 0) {
                vertices.push(...vertex1, ...vertex4, ...vertex3);
                normals.push(...normal1, ...normal4, ...normal3);
            } else if (t + 1 == numLatitudeLines) {
                vertices.push(...vertex3, ...vertex2, ...vertex1);
                normals.push(...normal3, ...normal2, ...normal1);
            } else {
                vertices.push(...vertex1, ...vertex4, ...vertex2);
                vertices.push(...vertex2, ...vertex4, ...vertex3);

                normals.push(...normal1, ...normal4, ...normal2);
                normals.push(...normal2, ...normal4, ...normal3);
            }
        }
    }

    // One vertex at every latitude-longitude intersection,
    // plus one for the north pole and one for the south.
    // One meridian serves as a UV seam, so we double the vertices there.

    // const points = new Array(numVertices);
    // const uvPoints = new Array(numVertices);

    // // North pole.
    // points[0] = vec3.fromValues(0, radius, 0);
    // uvPoints[0] = vec2.fromValues(0, 1);

    // // South pole.
    // points[numVertices - 1] = vec3.fromValues(0, -radius, 0);
    // uvPoints[numVertices - 1] = vec2.fromValues(0, 0);

    // // +1.0f because there's a gap between the poles and the first parallel.
    // const latitudeSpacing = 1.0 / (numLatitudeLines + 1.0);
    // const longitudeSpacing = 1.0 / (numLongitudeLines);

    // // start writing new vertices at position 1
    // let v = 1;
    // for (let latitude = 0; latitude < numLatitudeLines; latitude++) {
    //     for (let longitude = 0; longitude <= numLongitudeLines; longitude++) {

    //         // Scale coordinates into the 0...1 texture coordinate range,
    //         // with north at the top (y = 1).
    //         uvPoints[v] = vec2.fromValues(longitude * longitudeSpacing, 1.0 - (latitude + 1) * latitudeSpacing);

    //         // Convert to spherical coordinates:
    //         // theta is a longitude angle (around the equator) in radians.
    //         // phi is a latitude angle (north or south of the equator).
    //         const theta = uvPoints[v][0] * 2.0 * Math.PI
    //         const phi = (uvPoints[v][1] - 0.5) * Math.PI

    //         // This determines the radius of the ring of this line of latitude.
    //         // It's widest at the equator, and narrows as phi increases/decreases.
    //         const c = Math.cos(phi);

    //         // Usual formula for a vector in spherical coordinates.
    //         // You can exchange x & z to wind the opposite way around the sphere.
    //         points[v] = vec3.fromValues(c * Math.cos(theta), Math.sin(phi), c * Math.sin(theta));

    //         // Proceed to the next vertex.
    //         v++;
    //     }
    // }

    // console.log(points);

    // // Flatten from separate vectors to just floats:
    // points.forEach((point) => {
    //     vertices.push(...point);
    // });

    // uvPoints.forEach((point) => {
    //     uvs.push(...point);
    // });

    console.log(vertices);

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
        // TEXCOORD_0: new Accessor(bufferView, COMPONENT.TYPE.FLOAT, 'VEC2', uvs.length, vertices.length * 4 + normals.length * 4)
    };

    const primitive = new Primitive(attributes, material, null, mode);

    return primitive;

};