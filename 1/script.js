// Import libraries
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.126.0/build/three.module.js'
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.126.0/examples/jsm/controls/OrbitControls.js'
import { TransformControls } from 'https://cdn.jsdelivr.net/npm/three@0.126.0/examples/jsm/controls/TransformControls.js'
import { Rhino3dmLoader } from 'https://cdn.jsdelivr.net/npm/three@0.126.0/examples/jsm/loaders/3DMLoader.js'
import rhino3dm from 'https://cdn.jsdelivr.net/npm/rhino3dm@0.15.0-beta/rhino3dm.module.js'

const model = 'mesh.3dm'

const material = new THREE.MeshBasicMaterial( {color:0xffffff, transparent: true, opacity: 0.75} )
const lineMagentaMaterial = new THREE.LineBasicMaterial( { color: 0xff00ff} )
const lineBlackMaterial = new THREE.LineBasicMaterial( { color: 0x000000} )

window.addEventListener( 'click', handleInteraction, false)
window.addEventListener( 'touchstart', handleInteraction, false)

// declare variables to store scene, camera, and renderer
let scene, camera, renderer, mouse, raycaster, controls, tcontrols
let terrainMesh, meshes

init()
load()

function load() {

    // load and pass to threejs
    const loader = new Rhino3dmLoader()
    loader.setLibraryPath( 'https://cdn.jsdelivr.net/npm/rhino3dm@0.15.0-beta/' )

    loader.load( model, function ( object ) {

        // uncomment to hide spinner when model loads
        document.getElementById('loader').style.display = 'none'

        object.traverse( child => {
            if (child.isMesh) {
                child.material = material
                terrainMesh = child
                meshes.push(terrainMesh)
            } else if (child.isLine) {
                const layerIndex = child.userData.attributes.layerIndex
                if (object.userData.layers[layerIndex].name === 'dashed')
                    child.material = lineMagentaMaterial
                else
                    child.material = lineBlackMaterial
            }
        })

        console.log( object )

        scene.add( object )

    } )

}

// function to setup the scene, camera, renderer, and load 3d model
function init () {

    // Rhino models are z-up, so set this as the default
    THREE.Object3D.DefaultUp = new THREE.Vector3( 0, 0, 1 )

    // create a scene and a camera
    scene = new THREE.Scene()
    scene.background = new THREE.Color(1,1,1)
    camera = new THREE.PerspectiveCamera( 65, window.innerWidth / window.innerHeight, 0.1, 1000 )
    camera.position.x = 100
    camera.position.y = 100
    camera.position.z = 100

    // create the renderer and add it to the html
    renderer = new THREE.WebGLRenderer( { antialias: true } )
    renderer.setPixelRatio( window.devicePixelRatio )
    renderer.setSize( window.innerWidth, window.innerHeight )
    document.body.appendChild( renderer.domElement )

    tcontrols = new TransformControls( camera, renderer.domElement )
    tcontrols.enabled = false
    tcontrols.setSpace('local')
    scene.add(tcontrols)
    // add some controls to orbit the camera
    controls = new OrbitControls( camera, renderer.domElement )

    raycaster = new THREE.Raycaster()
    mouse = new THREE.Vector2()

    meshes = []

    // handle changes in the window size
    window.addEventListener( 'resize', onWindowResize, false )

    animate()

}

function handleInteraction( event ) {

    // console.log( event )

    let coordinates = null
    if ( event instanceof MouseEvent ) {
        if ( event.type === 'click' ) {
            coordinates =  { x: event.clientX, y: event.clientY }
        }
    } else if ( event instanceof TouchEvent ) {
        if ( event.type === 'touchstart' ) {
            coordinates =  { x: event.changedTouches[0].clientX, y: event.changedTouches[0].clientY }
        }
    }
    onClick( coordinates )
}

function onClick( coo ) {

    console.log( `click! (${coo.x}, ${coo.y})`)

	// calculate mouse position in normalized device coordinates
    // (-1 to +1) for both components

	mouse.x = ( coo.x / window.innerWidth ) * 2 - 1
    mouse.y = - ( coo.y / window.innerHeight ) * 2 + 1
    
    raycaster.setFromCamera( mouse, camera )

	// calculate objects intersecting the picking ray
    const intersects = raycaster.intersectObjects( meshes, true )

    if (intersects.length > 0 && !tcontrols.enabled) {

        console.log(intersects[0])

        // get closest object
        const object = intersects[0].object

        console.log(object) // debug

        if ( object === terrainMesh ) {

            const icoGeo = new THREE.IcosahedronGeometry()
            const icoMat = new THREE.MeshNormalMaterial()
            const ico = new THREE.Mesh(icoGeo, icoMat)
            ico.position.set(intersects[0].point.x, intersects[0].point.y, intersects[0].point.z)
            ico.userData.material = icoMat
            scene.add(ico)
            meshes.push(ico)

        } else {

            controls.enabled = false

            tcontrols.enabled = true
            tcontrols.attach( object )
            tcontrols.addEventListener( 'dragging-changed', onChange )
            
            console.log(object) // debug

        }

    } else {
        
        tcontrols.detach()
        tcontrols.enabled = false
        tcontrols.removeEventListener( 'dragging-changed', onChange )
        controls.enabled = true
        controls.update()
        
    }
}

let dragging = false
function onChange(e) {
    dragging = ! dragging
    if (!dragging) {

        console.log(e.target.object)

        const intersector = new THREE.Raycaster()

        const position = new THREE.Vector3(e.target.object.position.x, e.target.object.position.y, 100)

        intersector.set( position, new THREE.Vector3(0,0,-1))
        console.log(intersector)

        const intersects = intersector.intersectObject( terrainMesh )
        console.log(intersects)

        e.target.object.position.set(intersects[0].point.x, intersects[0].point.y, intersects[0].point.z)

    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize( window.innerWidth, window.innerHeight )
    animate()
}

// function to continuously render the scene
function animate() {
    requestAnimationFrame( animate )
    renderer.render( scene, camera )
}