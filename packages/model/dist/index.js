'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var constants = require('three/src/constants');
var Object3D = require('three/src/core/Object3D');
var TextureLoader = require('three/src/loaders/TextureLoader');
var MeshBasicMaterial = require('three/src/materials/MeshBasicMaterial');
var MeshLambertMaterial = require('three/src/materials/MeshLambertMaterial');
var Mesh = require('three/src/objects/Mesh');
var Group = require('three/src/objects/Group');
var BoxGeometry = require('three/src/geometries/BoxGeometry');
var Vector3 = require('three/src/math/Vector3');
var Vector2 = require('three/src/math/Vector2');
var BufferAttribute = require('three/src/core/BufferAttribute');
var three = require('three');
var BoxHelper = require('three/src/helpers/BoxHelper');
var Color = require('three/src/math/Color');
var CanvasTexture = require('three/src/textures/CanvasTexture');

const DEFAULT_TRANSFORM = {
    rotation: [0, 0, 0],
    translation: [0, 0, 0],
    scale: [1, 1, 1],
};
const DEFAULT_DISPLAY = {
    ground: DEFAULT_TRANSFORM,
    gui: DEFAULT_TRANSFORM,
    thirdperson_lefthand: DEFAULT_TRANSFORM,
    thirdperson_righthand: DEFAULT_TRANSFORM,
    firstperson_lefthand: DEFAULT_TRANSFORM,
    firstperson_righthand: DEFAULT_TRANSFORM,
    fixed: DEFAULT_TRANSFORM,
    head: DEFAULT_TRANSFORM,
};
const BUILTIN_GENERATED = {
    display: DEFAULT_DISPLAY,
    ambientocclusion: false,
    textures: {},
    elements: [
        {
            from: [0, 0, 0],
            to: [16, 16, 16],
            faces: {
                down: { uv: [0, 0, 16, 16], texture: "" },
            },
        }
    ],
    overrides: [],
};
function findRealTexturePath(model, variantKey) {
    let texturePath = model.textures[variantKey];
    while (texturePath.startsWith("#")) {
        const next = model.textures[texturePath.substring(1, texturePath.length)];
        if (!next) {
            return undefined;
        }
        texturePath = next;
    }
    return texturePath;
}
class BlockModelObject extends Object3D.Object3D {
    constructor() {
        super(...arguments);
        this.animationLoop = false;
        this.displayOption = DEFAULT_DISPLAY;
    }
    applyDisplay(option) {
        const group = this.children[0];
        if (option === "block") {
            // reset transformations
            group.rotation.set(0, 0, 0);
            group.position.set(0, 0, 0);
            group.scale.set(1, 1, 1);
        }
        else {
            if (!this.displayOption.hasOwnProperty(option)) {
                throw new Error("Display option is invalid.");
            }
            const options = this.displayOption[option];
            const rot = options.rotation;
            const pos = options.translation;
            const scale = options.scale;
            // apply transformations
            group.rotation.set(rot[0] * Math.PI / 180, rot[1] * Math.PI / 180, rot[2] * Math.PI / 180);
            group.position.set(pos[0], pos[1], pos[2]);
            group.scale.set(scale[0] === 0 ? 0.00001 : scale[0], scale[1] === 0 ? 0.00001 : scale[1], scale[2] === 0 ? 0.00001 : scale[2]);
        }
    }
    getCenter() {
        const group = this.children[0];
        // compute absolute bounding box
        const box = {
            minx: 0, miny: 0, minz: 0,
            maxx: 0, maxy: 0, maxz: 0,
        };
        for (let i = 0; i < group.children.length; i++) {
            const pivot = group.children[i];
            const mesh = pivot.children[0];
            mesh.geometry;
            // for (let j = 0; j < geo.vertices.length; j++) {
            //     // convert vertex coordinates to world coordinates
            //     const vertex = geo.vertices[j].clone();
            //     const abs = mesh.localToWorld(vertex);
            //     // update bounding box
            //     if (abs.x < box.minx) { box.minx = abs.x; }
            //     if (abs.y < box.miny) { box.miny = abs.y; }
            //     if (abs.z < box.minz) { box.minz = abs.z; }
            //     if (abs.x > box.maxx) { box.maxx = abs.x; }
            //     if (abs.y > box.maxy) { box.maxy = abs.y; }
            //     if (abs.z > box.maxz) { box.maxz = abs.z; }
            // }
        }
        // return the center of the bounding box
        return new Vector3.Vector3((box.minx + box.maxx) / 2, (box.miny + box.maxy) / 2, (box.minz + box.maxz) / 2);
    }
}
class BlockModelFactory {
    constructor(textureRegistry, option = {}) {
        this.textureRegistry = textureRegistry;
        this.option = option;
        this.loader = new TextureLoader.TextureLoader();
        this.cachedMaterial = {};
    }
    /**
     * Get threejs `Object3D` for that block model.
     */
    async getObject(model, options) {
        const option = this.option;
        const textureRegistry = this.textureRegistry;
        const clipUVs = option.clipUVs || false;
        option.modelOnly || false;
        const obj = new BlockModelObject();
        const group = new Group.Group();
        group.name = "wrapper";
        const materials = [BlockModelFactory.TRANSPARENT_MATERIAL];
        const materialIndexes = {};
        const materialPathIndexes = {};
        for (const variant of Object.keys(model.textures)) {
            const texPath = findRealTexturePath(model, variant);
            let materialIndex = 0;
            if (!texPath) {
                console.error(`Cannot find texture @${texPath}`);
            }
            else {
                let materialPathIndex = materialPathIndexes[texPath];
                if (materialPathIndex) ;
                else if (texPath in this.cachedMaterial) {
                    materialPathIndex = materials.length;
                    materials.push(this.cachedMaterial[texPath]);
                }
                else if (texPath in textureRegistry) {
                    // build new material
                    const tex = textureRegistry[texPath];
                    let texture;
                    if ((options === null || options === void 0 ? void 0 : options.waitForTextures) === true) {
                        texture = await new Promise((r) => {
                            this.loader.load(tex.url, (texture) => {
                                r(texture);
                            });
                        });
                    }
                    else {
                        texture = this.loader.load(tex.url);
                    }
                    // sharp pixels and smooth edges
                    texture.magFilter = constants.NearestFilter;
                    texture.minFilter = constants.LinearFilter;
                    // map texture to material, keep transparency and fix transparent z-fighting
                    const mat = new MeshLambertMaterial.MeshLambertMaterial({ map: texture, transparent: true, alphaTest: 0.5 });
                    materialPathIndex = materials.length;
                    this.cachedMaterial[texPath] = mat;
                    materials.push(mat);
                }
                materialPathIndexes[texPath] = materialPathIndex;
                materialIndex = materialPathIndex;
            }
            materialIndexes[variant] = materialIndex;
        }
        for (const element of model.elements) {
            // get dimensions and origin
            const width = element.to[0] - element.from[0];
            const height = element.to[1] - element.from[1];
            const length = element.to[2] - element.from[2];
            const origin = {
                x: (element.to[0] + element.from[0]) / 2 - 8,
                y: (element.to[1] + element.from[1]) / 2 - 8,
                z: (element.to[2] + element.from[2]) / 2 - 8,
            };
            const fix = 0.001;
            const blockGeometry = new BoxGeometry.BoxGeometry(width + fix, height + fix, length + fix);
            const blockMesh = new Mesh.Mesh(blockGeometry, materials);
            blockMesh.name = "block-element";
            blockGeometry.clearGroups();
            blockMesh.position.x = origin.x;
            blockMesh.position.y = origin.y;
            blockMesh.position.z = origin.z;
            const uvAttr = [];
            const faces = ["east", "west", "up", "down", "south", "north"];
            const getDefaultUv = (i) => [
                [
                    // east
                    element.from[2],
                    element.from[1],
                    element.to[2],
                    element.to[1],
                ],
                [
                    // west
                    element.from[2],
                    element.from[1],
                    element.to[2],
                    element.to[1],
                ],
                [
                    // up
                    element.from[0],
                    element.from[2],
                    element.to[0],
                    element.to[2],
                ],
                [
                    // down
                    element.from[0],
                    element.from[2],
                    element.to[0],
                    element.to[2],
                ],
                [
                    // south
                    element.from[0],
                    element.from[1],
                    element.to[0],
                    element.to[1],
                ],
                [
                    // north
                    element.from[0],
                    element.from[1],
                    element.to[0],
                    element.to[1],
                ]
            ][i];
            for (let i = 0; i < 6; i++) {
                const face = element.faces[faces[i]];
                let materialIndex = 0;
                let uv;
                if (face) {
                    // get material index
                    materialIndex = materialIndexes[face.texture.substring(1, face.texture.length)]; // references.indexOf(ref[0] == '#' ? ref.substring(1) : ref)
                    uv = face.uv || getDefaultUv(i);
                    if (clipUVs) {
                        uv = uv.map((e) => {
                            if (e + 0.00001 < 0) {
                                return 0;
                            }
                            else if (e - 0.00001 > 16) {
                                return 16;
                            }
                            else {
                                return e;
                            }
                        });
                    }
                    uv = uv.map((e) => e / 16);
                }
                else {
                    uv = [0, 0, 1, 1];
                    // transparent material
                }
                const [x1, y1, x2, y2] = uv;
                let map = [
                    new Vector2.Vector2(x1, y2),
                    new Vector2.Vector2(x2, y2),
                    new Vector2.Vector2(x1, y1),
                    new Vector2.Vector2(x2, y1),
                ];
                if (face && face.rotation) {
                    const amount = face.rotation;
                    // check property
                    if (!([0, 90, 180, 270].indexOf(amount) >= 0)) {
                        console.error("The \"rotation\" property for \"" + face + "\" face is invalid (got \"" + amount + "\").");
                    }
                    // rotate map
                    for (let j = 0; j < amount / 90; j++) {
                        map = [map[1], map[2], map[3], map[0]];
                    }
                }
                uvAttr.push(...map);
                blockGeometry.addGroup(i * 6, 6, materialIndex);
                // blockGeometry.uvsNeedUpdate = true;
            }
            blockGeometry.setAttribute("uv", new BufferAttribute.BufferAttribute(new Float32Array(uvAttr.length * 2), 2).copyVector2sArray(uvAttr));
            /**
             * bake rotation start
             */
            if (element.rotation) {
                // get origin, axis and angle
                const rotationOrigin = {
                    x: element.rotation.origin[0] - 8,
                    y: element.rotation.origin[1] - 8,
                    z: element.rotation.origin[2] - 8,
                };
                const axis = element.rotation.axis;
                const angle = element.rotation.angle;
                // create pivot
                const pivot = new Group.Group();
                pivot.name = "pivot";
                pivot.position.x = rotationOrigin.x;
                pivot.position.y = rotationOrigin.y;
                pivot.position.z = rotationOrigin.z;
                pivot.add(blockMesh);
                // adjust mesh coordinates
                blockMesh.position.x -= rotationOrigin.x;
                blockMesh.position.y -= rotationOrigin.y;
                blockMesh.position.z -= rotationOrigin.z;
                // rotate pivot
                if (axis === "x") {
                    pivot.rotateX(angle * Math.PI / 180);
                }
                else if (axis === "y") {
                    pivot.rotateY(angle * Math.PI / 180);
                }
                else if (axis === "z") {
                    pivot.rotateZ(angle * Math.PI / 180);
                }
                group.add(pivot);
            }
            else {
                const pivot = new Group.Group();
                pivot.name = "pivot";
                pivot.add(blockMesh);
                group.add(pivot);
            }
        }
        obj.add(group);
        return obj;
    }
}
BlockModelFactory.TRANSPARENT_MATERIAL = new MeshBasicMaterial.MeshBasicMaterial({ transparent: true, opacity: 0, alphaTest: 0.5 });

function createGroup(slim) {
    return {
        head: {
            h: 0,
            w: 0,
            d: 0,
            x: 0,
            y: 0,
            z: 0,
            layer: {
                w: 9,
                h: 9,
                d: 9,
                top: [40, 0, 48, 8],
                bottom: [48, 0, 56, 8],
                right: [32, 8, 40, 16],
                front: [40, 8, 48, 16],
                left: [48, 8, 56, 16],
                back: [56, 8, 64, 16],
            },
            top: [8, 0, 16, 8],
            bottom: [24, 8, 16, 0],
            right: [0, 8, 8, 16],
            front: [8, 8, 16, 16],
            left: [16, 8, 24, 16],
            back: [24, 8, 32, 16],
        },
        rightLeg: {
            h: 0,
            w: 0,
            d: 0,
            x: 0,
            y: 0,
            z: 0,
            layer: {
                w: 4.5,
                d: 4.5,
                h: 13.5,
                top: [4, 48, 8, 36],
                bottom: [8, 48, 12, 36],
                right: [0, 36, 4, 48],
                front: [4, 36, 8, 48],
                left: [8, 36, 12, 48],
                back: [12, 36, 16, 48],
            },
            top: [4, 16, 8, 20],
            bottom: [8, 16, 12, 20],
            right: [0, 20, 4, 32],
            front: [4, 20, 8, 32],
            left: [8, 20, 12, 32],
            back: [12, 20, 16, 32],
        },
        torso: {
            h: 0,
            w: 0,
            d: 0,
            x: 0,
            y: 0,
            z: 0,
            layer: {
                w: 9,
                h: 13.5,
                d: 4.5,
                top: [20, 48, 28, 36],
                bottom: [28, 48, 36, 36],
                right: [16, 36, 20, 48],
                front: [20, 36, 28, 48],
                left: [28, 36, 32, 48],
                back: [32, 36, 40, 48],
            },
            top: [20, 16, 28, 20],
            bottom: [28, 16, 36, 20],
            right: [16, 20, 20, 32],
            front: [20, 20, 28, 32],
            left: [28, 20, 32, 32],
            back: [32, 20, 40, 32],
        },
        leftArm: {
            h: 0,
            w: 0,
            d: 0,
            x: 0,
            y: 0,
            z: 0,
            layer: {
                w: 4.5,
                h: 13.5,
                d: 4.5,
                top: [52, 48, 56, 52],
                bottom: [56, 48, 60, 52],
                right: [48, 52, 52, 64],
                front: [52, 52, 56, 64],
                left: [56, 52, 60, 64],
                back: [60, 52, 64, 64],
            },
            top: [36, 48, slim ? 39 : 40, 52],
            bottom: [slim ? 39 : 40, 48, slim ? 42 : 44, 52],
            left: [32, 52, 36, 64],
            front: [36, 52, slim ? 39 : 40, 64],
            right: [slim ? 39 : 40, 52, slim ? 43 : 44, 64],
            back: [slim ? 43 : 44, 52, slim ? 46 : 48, 64],
        },
        rightArm: {
            h: 0,
            w: 0,
            d: 0,
            x: 0,
            y: 0,
            z: 0,
            layer: {
                w: 4.5,
                h: 13.5,
                d: 4.5,
                top: [44, 48, 48, 36],
                bottom: [48, 48, 52, 36],
                left: [48, 36, 52, 48],
                front: [44, 36, 48, 48],
                right: [40, 36, 44, 48],
                back: [52, 36, 64, 48],
            },
            top: [44, 16, slim ? 47 : 48, 20],
            bottom: [slim ? 47 : 48, 16, slim ? 50 : 52, 20],
            left: [40, 20, 44, 32],
            front: [44, 20, slim ? 47 : 48, 32],
            right: [slim ? 47 : 48, 20, slim ? 51 : 52, 32],
            back: [slim ? 51 : 52, 20, slim ? 54 : 56, 32],
        },
        leftLeg: {
            h: 0,
            w: 0,
            d: 0,
            x: 0,
            y: 0,
            z: 0,
            layer: {
                w: 4.5,
                d: 4.5,
                h: 13.5,
                top: [4, 48, 8, 52],
                bottom: [8, 48, 12, 52],
                right: [0, 52, 4, 64],
                front: [4, 52, 8, 64],
                left: [8, 52, 12, 64],
                back: [12, 52, 16, 64],
            },
            top: [20, 48, 24, 52],
            bottom: [24, 48, 28, 52],
            right: [16, 52, 20, 64],
            front: [20, 52, 24, 64],
            left: [24, 52, 28, 64],
            back: [28, 52, 32, 64],
        },
        cape: {
            x: 0,
            y: 0,
            z: 0,
            h: 0,
            w: 0,
            d: 0,
            top: [1, 0, 11, 1],
            bottom: [11, 0, 21, 1],
            left: [11, 1, 12, 17],
            front: [12, 1, 22, 17],
            right: [0, 1, 1, 17],
            back: [1, 1, 11, 17],
        },
    };
}
const PIXRATIO = 1 / 32;
function create(slim) {
    function decorateDimension(group) {
        function calculate(model) {
            return {
                h: Math.abs(model.front[1] - model.front[3]) * PIXRATIO,
                w: Math.abs(model.front[0] - model.front[2]) * PIXRATIO,
                d: Math.abs(model.right[0] - model.right[2]) * PIXRATIO,
            };
        }
        for (const part of Object.values(group)) {
            Object.assign(part, calculate(part));
            if ("layer" in part) {
                part.layer.w *= PIXRATIO;
                part.layer.h *= PIXRATIO;
                part.layer.d *= PIXRATIO;
            }
        }
        return group;
    }
    function decoratePos(group) {
        const charH = 1;
        group.head.y = charH - group.head.h / 2;
        group.torso.y = group.rightLeg.h + group.torso.h / 2;
        group.rightLeg.x = -group.rightLeg.w / 2;
        group.rightLeg.y = group.rightLeg.h / 2;
        group.leftLeg.x = group.leftLeg.w / 2;
        group.leftLeg.y = group.leftLeg.h / 2;
        group.rightArm.x = -group.torso.w / 2 - group.rightArm.w / 2;
        group.rightArm.y = group.rightLeg.h + group.torso.h - group.rightArm.h / 2;
        group.leftArm.x = group.torso.w / 2 + group.leftArm.w / 2;
        group.leftArm.y = group.leftLeg.h + group.torso.h - group.leftArm.h / 2;
        group.cape.y = group.rightLeg.h + group.torso.h / 5 * 2;
        group.cape.z = -group.torso.d * 3 / 2;
        return group;
    }
    return decoratePos(decorateDimension(createGroup(slim)));
}
var format = {
    steve: create(false),
    alex: create(true),
};

function convertLegacySkin(context, width) {
    const scale = width / 64.0;
    function copySkin(ctx, sX, sY, w, h, dX, dY, flipHorizontal) {
        sX *= scale;
        sY *= scale;
        w *= scale;
        h *= scale;
        dX *= scale;
        dY *= scale;
        const imgData = ctx.getImageData(sX, sY, w, h);
        if (flipHorizontal) {
            for (let y = 0; y < h; y++) {
                for (let x = 0; x < (w / 2); x++) {
                    const index = (x + y * w) * 4;
                    const index2 = ((w - x - 1) + y * w) * 4;
                    const pA1 = imgData.data[index];
                    const pA2 = imgData.data[index + 1];
                    const pA3 = imgData.data[index + 2];
                    const pA4 = imgData.data[index + 3];
                    const pB1 = imgData.data[index2];
                    const pB2 = imgData.data[index2 + 1];
                    const pB3 = imgData.data[index2 + 2];
                    const pB4 = imgData.data[index2 + 3];
                    imgData.data[index] = pB1;
                    imgData.data[index + 1] = pB2;
                    imgData.data[index + 2] = pB3;
                    imgData.data[index + 3] = pB4;
                    imgData.data[index2] = pA1;
                    imgData.data[index2 + 1] = pA2;
                    imgData.data[index2 + 2] = pA3;
                    imgData.data[index2 + 3] = pA4;
                }
            }
        }
        ctx.putImageData(imgData, dX, dY);
    }
    copySkin(context, 4, 16, 4, 4, 20, 48, true); // Top Leg
    copySkin(context, 8, 16, 4, 4, 24, 48, true); // Bottom Leg
    copySkin(context, 0, 20, 4, 12, 24, 52, true); // Outer Leg
    copySkin(context, 4, 20, 4, 12, 20, 52, true); // Front Leg
    copySkin(context, 8, 20, 4, 12, 16, 52, true); // Inner Leg
    copySkin(context, 12, 20, 4, 12, 28, 52, true); // Back Leg
    copySkin(context, 44, 16, 4, 4, 36, 48, true); // Top Arm
    copySkin(context, 48, 16, 4, 4, 40, 48, true); // Bottom Arm
    copySkin(context, 40, 20, 4, 12, 40, 52, true); // Outer Arm
    copySkin(context, 44, 20, 4, 12, 36, 52, true); // Front Arm
    copySkin(context, 48, 20, 4, 12, 32, 52, true); // Inner Arm
    copySkin(context, 52, 20, 4, 12, 44, 52, true); // Back Arm
}
function mapCubeUV(mesh, src) {
    const material = mesh.material;
    const texture = material.map;
    const tileUvW = 1 / texture.image.width;
    const tileUvH = 1 / texture.image.height;
    const uvs = [];
    /**
     * Set the box mesh UV to the Minecraft skin texture
     */
    function mapUV(x1, y1, x2, y2) {
        x1 *= tileUvW;
        x2 *= tileUvW;
        y1 = 1 - (y1 * tileUvH);
        y2 = 1 - (y2 * tileUvH);
        uvs.push(new three.Vector2(x1, y1), new three.Vector2(x2, y1), new three.Vector2(x1, y2), new three.Vector2(x2, y2));
    }
    const faces = ["left", "right", "top", "bottom", "front", "back"];
    for (let i = 0; i < faces.length; i++) {
        const uvs = src[faces[i]];
        mapUV(uvs[0], uvs[1], uvs[2], uvs[3]);
    }
    const attr = new three.BufferAttribute(new Float32Array(uvs.length * 2), 2).copyVector2sArray(uvs);
    mesh.geometry.setAttribute("uv", attr);
}
class PlayerObject3D extends Object3D.Object3D {
    constructor(skin, cape, transparent, slim) {
        super();
        this._slim = false;
        this._slim = slim;
        buildPlayerModel(this, skin, cape, transparent, slim);
    }
    get slim() {
        return this._slim;
    }
    set slim(slim) {
        if (slim !== this._slim) {
            const template = slim ? format.alex : format.steve;
            const leftArm = this.getObjectByName("leftArm");
            const rightArm = this.getObjectByName("rightArm");
            leftArm.geometry = new BoxGeometry.BoxGeometry(template.leftArm.w, template.leftArm.h, template.leftArm.d);
            mapCubeUV(leftArm, template.leftArm);
            rightArm.geometry = new BoxGeometry.BoxGeometry(template.rightArm.w, template.rightArm.h, template.rightArm.d);
            mapCubeUV(rightArm, template.rightArm);
            const leftArmLayer = this.getObjectByName("leftArmLayer");
            const rightArmLayer = this.getObjectByName("rightArmLayer");
            if (leftArmLayer) {
                leftArmLayer.geometry = new BoxGeometry.BoxGeometry(template.leftArm.layer.w, template.leftArm.layer.h, template.leftArm.layer.d);
                mapCubeUV(leftArmLayer, template.leftArm.layer);
            }
            if (rightArmLayer) {
                rightArmLayer.geometry = new BoxGeometry.BoxGeometry(template.rightArm.layer.w, template.rightArm.layer.h, template.rightArm.layer.d);
                mapCubeUV(rightArmLayer, template.rightArm.layer);
            }
        }
        this._slim = slim;
    }
}
function buildPlayerModel(root, skin, cape, transparent, slim) {
    const template = slim ? format.alex : format.steve;
    const partsNames = Object.keys(template);
    for (const partName of partsNames) {
        const model = template[partName];
        const mesh = new Mesh.Mesh(new BoxGeometry.BoxGeometry(model.w, model.h, model.d), partName === "cape" ? cape : skin);
        mesh.name = partName;
        if (model.y) {
            mesh.position.y = model.y;
        }
        if (model.x) {
            mesh.position.x = model.x;
        }
        if (model.z) {
            mesh.position.z = model.z;
        }
        if (partName === "cape") {
            mesh.rotation.x = 25 * (Math.PI / 180);
        }
        mapCubeUV(mesh, model);
        const box = new BoxHelper.BoxHelper(mesh, new Color.Color(0xffffff));
        box.name = `${partName}Box`;
        box.visible = false;
        mesh.add(box);
        if ("layer" in model) {
            const layer = model.layer;
            const layerMesh = new Mesh.Mesh(new BoxGeometry.BoxGeometry(layer.w, layer.h, layer.d), transparent);
            layerMesh.name = `${partName}Layer`;
            if (layer.y) {
                layerMesh.position.y = layer.y;
            }
            if (layer.x) {
                layerMesh.position.x = layer.x;
            }
            if (layer.z) {
                layerMesh.position.z = layer.z;
            }
            mapCubeUV(layerMesh, layer);
            mesh.add(layerMesh);
        }
        root.add(mesh);
    }
    return root;
}
function ensureImage(textureSource) {
    if (textureSource instanceof Image) {
        return textureSource;
    }
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => { resolve(img); };
        img.onerror = (e, source, lineno, colno, error) => { reject(error); };
        if (textureSource instanceof URL) {
            img.src = textureSource.toString();
        }
        else {
            img.src = textureSource;
        }
    });
}
class PlayerModel {
    constructor() {
        const canvas = document.createElement("canvas");
        canvas.width = 64;
        canvas.height = 64;
        const texture = new CanvasTexture.CanvasTexture(canvas);
        texture.magFilter = constants.NearestFilter;
        texture.minFilter = constants.NearestFilter;
        this.texturePlayer = texture;
        texture.name = "skinTexture";
        this.materialPlayer = new MeshBasicMaterial.MeshBasicMaterial({ map: texture });
        this.materialTransparent = new MeshBasicMaterial.MeshBasicMaterial({
            map: texture,
            transparent: true,
            depthWrite: false,
            side: constants.DoubleSide,
        });
        const textureCape = new CanvasTexture.CanvasTexture(document.createElement("canvas"));
        textureCape.magFilter = constants.NearestFilter;
        textureCape.minFilter = constants.NearestFilter;
        textureCape.name = "capeTexture";
        this.textureCape = textureCape;
        const materialCape = new MeshBasicMaterial.MeshBasicMaterial({
            map: this.textureCape,
        });
        materialCape.name = "capeMaterial";
        materialCape.visible = false;
        this.materialCape = materialCape;
        this.playerObject3d = new PlayerObject3D(this.materialPlayer, this.materialCape, this.materialTransparent, false);
    }
    static create() { return new PlayerModel(); }
    /**
     * @param skin The skin texture source. Should be url string, URL object, or a Image HTML element
     * @param isSlim Is this skin slim
     */
    async setSkin(skin, isSlim = false) {
        this.playerObject3d.slim = isSlim;
        const texture = this.texturePlayer;
        const i = await ensureImage(skin);
        const legacy = i.width !== i.height;
        const canvas = texture.image;
        const context = canvas.getContext("2d");
        canvas.width = i.width;
        canvas.height = i.width;
        context.clearRect(0, 0, i.width, i.width);
        if (legacy) {
            context.drawImage(i, 0, 0, i.width, i.width / 2.0);
            convertLegacySkin(context, i.width);
        }
        else {
            context.drawImage(i, 0, 0, i.width, i.width);
        }
        texture.needsUpdate = true;
    }
    async setCape(cape) {
        if (cape === undefined) {
            this.materialCape.visible = false;
            return;
        }
        this.materialCape.visible = true;
        const img = await ensureImage(cape);
        const texture = this.textureCape;
        texture.image = img;
        texture.needsUpdate = true;
    }
}

exports.BUILTIN_GENERATED = BUILTIN_GENERATED;
exports.BlockModelFactory = BlockModelFactory;
exports.BlockModelObject = BlockModelObject;
exports.DEFAULT_DISPLAY = DEFAULT_DISPLAY;
exports.DEFAULT_TRANSFORM = DEFAULT_TRANSFORM;
exports.PlayerModel = PlayerModel;
exports.PlayerObject3D = PlayerObject3D;
//# sourceMappingURL=index.js.map
