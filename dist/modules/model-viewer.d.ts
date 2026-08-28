export class CanvasTexture extends Texture$1 {
    constructor(canvas: any, mapping: any, wrapS: any, wrapT: any, magFilter: any, minFilter: any, format: any, type: any, anisotropy: any);
    isCanvasTexture: boolean;
    needsUpdate: boolean;
}
export class FileLoader extends Loader {
    load(url: any, onLoad: any, onProgress: any, onError: any): any;
    setResponseType(value: any): this;
    responseType: any;
    setMimeType(value: any): this;
    mimeType: any;
}
export class Loader {
    constructor(manager: any);
    manager: any;
    crossOrigin: string;
    withCredentials: boolean;
    path: string;
    resourcePath: string;
    requestHeader: {};
    load(): void;
    loadAsync(url: any, onProgress: any): Promise<any>;
    parse(): void;
    setCrossOrigin(crossOrigin: any): this;
    setWithCredentials(value: any): this;
    setPath(path: any): this;
    setResourcePath(resourcePath: any): this;
    setRequestHeader(requestHeader: any): this;
}
export namespace Loader {
    let DEFAULT_MATERIAL_NAME: string;
}
export const ModelViewerElement: {
    new (...args: any[]): {
        [x: string]: any;
        connectedCallback(): void;
        disconnectedCallback(): void;
        /**
         * Since the data-position and data-normal attributes are not observed, use
         * this method to move a hotspot. Keep in mind that all hotspots with the
         * same slot name use a single location and the first definition takes
         * precedence, until updated with this method.
         */
        updateHotspot(config: any): void;
        /**
         * This method returns in-scene data about a requested hotspot including
         * its position in screen (canvas) space and its current visibility.
         */
        queryHotspot(name: any): {
            position: {
                x: any;
                y: any;
                z: any;
                toString(): string;
            };
            normal: {
                x: any;
                y: any;
                z: any;
                toString(): string;
            };
            canvasPosition: {
                x: any;
                y: any;
                z: any;
                toString(): string;
            };
            facingCamera: any;
        } | null;
        /**
         * This method returns the model position, normal and texture coordinate
         * of the point on the mesh corresponding to the input pixel coordinates
         * given relative to the model-viewer element. The position and normal
         * are returned as strings in the format suitable for putting in a
         * hotspot's data-position and data-normal attributes. If the mesh is
         * not hit, the result is null.
         */
        positionAndNormalFromPoint(pixelX: any, pixelY: any): {
            position: {
                x: any;
                y: any;
                z: any;
                toString(): string;
            };
            normal: {
                x: any;
                y: any;
                z: any;
                toString(): string;
            };
            uv: {
                u: any;
                v: any;
                toString(): string;
            } | null;
        } | null;
        /**
         * This method returns a dynamic hotspot ID string of the point on the mesh
         * corresponding to the input pixel coordinates given relative to the
         * model-viewer element. The ID string can be used in the data-surface
         * attribute of the hotspot to make it follow this point on the surface even
         * as the model animates. If the mesh is not hit, the result is null.
         */
        surfaceFromPoint(pixelX: any, pixelY: any): any;
        [$addHotspot](node: any): void;
        [$removeHotspot](node: any): void;
        [$observer]: any;
    };
    [x: string]: any;
};
export const NearestFilter: 1003;
declare class Texture$1 extends EventDispatcher {
    constructor(image?: any, mapping?: number, wrapS?: number, wrapT?: number, magFilter?: number, minFilter?: number, format?: number, type?: number, anisotropy?: number, colorSpace?: string);
    isTexture: boolean;
    uuid: string;
    name: string;
    source: Source;
    mipmaps: any[];
    mapping: number;
    channel: number;
    wrapS: number;
    wrapT: number;
    magFilter: number;
    minFilter: number;
    anisotropy: number;
    format: number;
    internalFormat: any;
    type: number;
    offset: Vector2;
    repeat: Vector2;
    center: Vector2;
    rotation: number;
    matrixAutoUpdate: boolean;
    matrix: Matrix3;
    generateMipmaps: boolean;
    premultiplyAlpha: boolean;
    flipY: boolean;
    unpackAlignment: number;
    colorSpace: string;
    userData: {};
    version: number;
    onUpdate: any;
    isRenderTargetTexture: boolean;
    needsPMREMUpdate: boolean;
    set image(value: any);
    get image(): any;
    updateMatrix(): void;
    clone(): any;
    copy(source: any): this;
    set needsUpdate(value: any);
    toJSON(meta: any): any;
    dispose(): void;
    transformUv(uv: any): any;
    set encoding(encoding: 3000 | 3001);
    get encoding(): 3000 | 3001;
}
declare namespace Texture$1 {
    export let DEFAULT_IMAGE: any;
    export { UVMapping as DEFAULT_MAPPING };
    export let DEFAULT_ANISOTROPY: number;
}
declare const $addHotspot: unique symbol;
declare const $removeHotspot: unique symbol;
declare const $observer: unique symbol;
/**
 * https://github.com/mrdoob/eventdispatcher.js/
 */
declare class EventDispatcher {
    addEventListener(type: any, listener: any): void;
    _listeners: {} | undefined;
    hasEventListener(type: any, listener: any): boolean;
    removeEventListener(type: any, listener: any): void;
    dispatchEvent(event: any): void;
}
declare class Source {
    constructor(data?: null);
    isSource: boolean;
    uuid: string;
    data: any;
    version: number;
    set needsUpdate(value: any);
    toJSON(meta: any): any;
}
declare class Vector2 {
    constructor(x?: number, y?: number);
    x: number;
    y: number;
    set width(value: number);
    get width(): number;
    set height(value: number);
    get height(): number;
    set(x: any, y: any): this;
    setScalar(scalar: any): this;
    setX(x: any): this;
    setY(y: any): this;
    setComponent(index: any, value: any): this;
    getComponent(index: any): number;
    clone(): any;
    copy(v: any): this;
    add(v: any): this;
    addScalar(s: any): this;
    addVectors(a: any, b: any): this;
    addScaledVector(v: any, s: any): this;
    sub(v: any): this;
    subScalar(s: any): this;
    subVectors(a: any, b: any): this;
    multiply(v: any): this;
    multiplyScalar(scalar: any): this;
    divide(v: any): this;
    divideScalar(scalar: any): this;
    applyMatrix3(m: any): this;
    min(v: any): this;
    max(v: any): this;
    clamp(min: any, max: any): this;
    clampScalar(minVal: any, maxVal: any): this;
    clampLength(min: any, max: any): this;
    floor(): this;
    ceil(): this;
    round(): this;
    roundToZero(): this;
    negate(): this;
    dot(v: any): number;
    cross(v: any): number;
    lengthSq(): number;
    length(): number;
    manhattanLength(): number;
    normalize(): this;
    angle(): number;
    angleTo(v: any): number;
    distanceTo(v: any): number;
    distanceToSquared(v: any): number;
    manhattanDistanceTo(v: any): number;
    setLength(length: any): this;
    lerp(v: any, alpha: any): this;
    lerpVectors(v1: any, v2: any, alpha: any): this;
    equals(v: any): boolean;
    fromArray(array: any, offset?: number): this;
    toArray(array?: any[], offset?: number): any[];
    fromBufferAttribute(attribute: any, index: any): this;
    rotateAround(center: any, angle: any): this;
    random(): this;
    [Symbol.iterator](): Generator<number, void, unknown>;
}
declare class Matrix3 {
    constructor(n11: any, n12: any, n13: any, n21: any, n22: any, n23: any, n31: any, n32: any, n33: any);
    elements: number[];
    set(n11: any, n12: any, n13: any, n21: any, n22: any, n23: any, n31: any, n32: any, n33: any): this;
    identity(): this;
    copy(m: any): this;
    extractBasis(xAxis: any, yAxis: any, zAxis: any): this;
    setFromMatrix4(m: any): this;
    multiply(m: any): this;
    premultiply(m: any): this;
    multiplyMatrices(a: any, b: any): this;
    multiplyScalar(s: any): this;
    determinant(): number;
    invert(): this;
    transpose(): this;
    getNormalMatrix(matrix4: any): this;
    transposeIntoArray(r: any): this;
    setUvTransform(tx: any, ty: any, sx: any, sy: any, rotation: any, cx: any, cy: any): this;
    scale(sx: any, sy: any): this;
    rotate(theta: any): this;
    translate(tx: any, ty: any): this;
    makeTranslation(x: any, y: any): this;
    makeRotation(theta: any): this;
    makeScale(x: any, y: any): this;
    equals(matrix: any): boolean;
    fromArray(array: any, offset?: number): this;
    toArray(array?: any[], offset?: number): any[];
    clone(): any;
}
declare const UVMapping: 300;
export {};
//# sourceMappingURL=model-viewer.d.ts.map