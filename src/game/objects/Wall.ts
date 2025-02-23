import * as THREE from 'three'

export class Wall extends THREE.Mesh {
    constructor(geometry: THREE.BoxGeometry, position: [number, number, number]) {
        const wallMaterial = new THREE.MeshStandardMaterial({
            color: 0x808080,
            metalness: 0.2,
            roughness: 0.8
        })
        super(geometry, wallMaterial)
        this.position.set(...position)
    }
}
