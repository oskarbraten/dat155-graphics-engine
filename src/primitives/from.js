import Primitive from '../mesh/Primitive.js';

/**
 * Creates a new Primitive from an existing one, using the same attributes and indices (geomtry in other words).
 * This is useful when you want to have multiple objects with the same geometry, but different materials.
 * 
 * @param {Primitive} primitive
 * @param {Material} material
 * @param {integer} mode
 * @returns {Primitive}
 */
export default (primitive, material, mode) => {
    if (primitive instanceof Primitive) {
        return new Primitive(primitive.attributes, material, primitive.indices, mode);
    } else {
        throw new Error('Expected Primitive-instance as first argument (primitive).');
    }
};