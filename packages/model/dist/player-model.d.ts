export interface ModelTemplate {
    head: Part;
    rightLeg: Part;
    leftLeg: Part;
    torso: Part;
    leftArm: Part;
    rightArm: Part;
    cape: Transform & CubeUVMapping;
}
export interface Dimension {
    h: number;
    w: number;
    d: number;
}
export interface CubeUVMapping {
    top: number[];
    bottom: number[];
    right: number[];
    front: number[];
    left: number[];
    back: number[];
}
export interface Translation {
    x: number;
    y: number;
    z: number;
}
export interface Transform extends Translation, Dimension {
}
export interface Part extends Transform, CubeUVMapping {
    layer: Dimension & CubeUVMapping & Partial<Translation>;
}
declare const _default: {
    steve: ModelTemplate;
    alex: ModelTemplate;
};
export default _default;
//# sourceMappingURL=player-model.d.ts.map