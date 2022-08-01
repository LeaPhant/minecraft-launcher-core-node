import { BlockModel, PackMeta } from "@xmcl/resourcepack";
import { Object3D } from "three/src/core/Object3D";
import { Vector3 } from "three/src/math/Vector3";
interface Texture {
    url: string;
    animation?: PackMeta.Animation;
}
declare type TextureRegistry = Record<string, Texture>;
export declare const DEFAULT_TRANSFORM: BlockModel.Transform;
export declare const DEFAULT_DISPLAY: BlockModel.Display;
export declare const BUILTIN_GENERATED: BlockModel.Resolved;
export declare class BlockModelObject extends Object3D {
    animationLoop: boolean;
    displayOption: BlockModel.Display;
    applyDisplay(option: string): void;
    getCenter(): Vector3;
}
export declare class BlockModelFactory {
    readonly textureRegistry: TextureRegistry;
    readonly option: {
        clipUVs?: boolean;
        modelOnly?: boolean;
    };
    private static TRANSPARENT_MATERIAL;
    private loader;
    private cachedMaterial;
    constructor(textureRegistry: TextureRegistry, option?: {
        clipUVs?: boolean;
        modelOnly?: boolean;
    });
    /**
     * Get threejs `Object3D` for that block model.
     */
    getObject(model: BlockModel.Resolved, options?: {
        uvlock?: boolean;
        y?: number;
        x?: number;
        waitForTextures?: boolean;
    }): Promise<BlockModelObject>;
}
export {};
//# sourceMappingURL=block.d.ts.map