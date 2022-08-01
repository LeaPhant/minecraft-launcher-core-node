import { Object3D } from "three/src/core/Object3D";
import { MeshBasicMaterial } from "three/src/materials/MeshBasicMaterial";
import { CanvasTexture } from "three/src/textures/CanvasTexture";
declare type TextureSource = string | HTMLImageElement | URL;
export declare class PlayerObject3D extends Object3D {
    private _slim;
    constructor(skin: MeshBasicMaterial, cape: MeshBasicMaterial, transparent: MeshBasicMaterial, slim: boolean);
    get slim(): boolean;
    set slim(slim: boolean);
}
export declare class PlayerModel {
    static create(): PlayerModel;
    readonly playerObject3d: PlayerObject3D;
    readonly materialPlayer: MeshBasicMaterial;
    readonly materialTransparent: MeshBasicMaterial;
    readonly materialCape: MeshBasicMaterial;
    readonly textureCape: CanvasTexture;
    readonly texturePlayer: CanvasTexture;
    constructor();
    /**
     * @param skin The skin texture source. Should be url string, URL object, or a Image HTML element
     * @param isSlim Is this skin slim
     */
    setSkin(skin: TextureSource, isSlim?: boolean): Promise<void>;
    setCape(cape: TextureSource | undefined): Promise<void>;
}
export default PlayerModel;
//# sourceMappingURL=player.d.ts.map