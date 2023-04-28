// ================================== SETUP FIREBASE ==================================
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAT_wJP2y-V9sE-AVv6dlmP7Scchr1ZiWs",
  authDomain: "boids-mnursey.firebaseapp.com",
  projectId: "boids-mnursey",
  storageBucket: "boids-mnursey.appspot.com",
  messagingSenderId: "796313135380",
  appId: "1:796313135380:web:1283d12a2ff44f4b15ba01"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// ================================== END SETUP FIREBASE ==================================

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Sky } from 'three/addons/objects/Sky.js';

function main() {
    const canvas = document.querySelector('#c');
    const renderer = new THREE.WebGLRenderer({
        antialias: true,
        canvas
    });

    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.75;

    const worldBounds = 200;

    const fov = 75;
    const aspect = 2; // the canvas default
    const near = 0.1;
    const far = 5000;
    const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    camera.position.x = worldBounds / 1.5;
    camera.position.y = worldBounds / 1.75;
    camera.position.z = worldBounds / 1.5;

    const controls = new OrbitControls( camera, renderer.domElement);
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.5;
    controls.enablePan = false;


    const scene = new THREE.Scene();


    let sky, sun, mainLight;

    // Add ambient light
    {
        const light = new THREE.AmbientLight( 0x404040 ); // soft white light
        scene.add( light );
    }

    // Add directional light
    {
        const color = 0xFFFFFF;
        const intensity = 1;
        mainLight = new THREE.DirectionalLight(color, intensity);
        mainLight.position.set(-1, 2, 4);
        scene.add(mainLight);
    }

    function initSky() {

        // Add Sky
        sky = new Sky();
        sky.scale.setScalar( 450000 );
        scene.add( sky );

        sun = new THREE.Vector3();

        const effectController = {
            turbidity: 6,
            rayleigh: 0.25,
            mieCoefficient: 0.001,
            mieDirectionalG: 0.4,
            elevation: 80,
            azimuth: 0,
            exposure: renderer.toneMappingExposure
        };

        const uniforms = sky.material.uniforms;
        uniforms[ 'turbidity' ].value = effectController.turbidity;
        uniforms[ 'rayleigh' ].value = effectController.rayleigh;
        uniforms[ 'mieCoefficient' ].value = effectController.mieCoefficient;
        uniforms[ 'mieDirectionalG' ].value = effectController.mieDirectionalG;

        const phi = THREE.MathUtils.degToRad( 90 - effectController.elevation );
        const theta = THREE.MathUtils.degToRad( effectController.azimuth );

        sun.setFromSphericalCoords( 1, phi, theta );

        uniforms[ 'sunPosition' ].value.copy( sun );
        mainLight.position.copy(sun);

        renderer.toneMappingExposure = effectController.exposure;
        renderer.render( scene, camera );
    }

    initSky();

    {
        // Create world bounds box
        const size = worldBounds;
        const widthSegments = 2;
        const heightSegments = 2;
        const depthSegments = 2;
        const geometry = new THREE.BoxGeometry(size, size, size, widthSegments, heightSegments, depthSegments);

        const edgeGeometry = new THREE.EdgesGeometry(geometry);

        const material = new THREE.LineBasicMaterial({color: 0xFFFFFF});
        const mesh = new THREE.LineSegments(edgeGeometry, material);    
        scene.add(mesh);
    }

    const boidRadius = 1.0;
    const boidHeight = 3.3;
    const radialSegments = 9;
    const boidGeometry = new THREE.ConeGeometry(boidRadius, boidHeight, radialSegments).rotateX(Math.PI / 2);

    const obstacleRadius =  1;  
    const obstacleDetail = 1;  
    const obstacleGeometry = new THREE.IcosahedronGeometry( obstacleRadius, obstacleDetail );

    // Setup Boid Parameters
    const obstacleRange = 15;
    const turnfactor = 0.2;
    const visualRange = 40.0;
    const protectedRange = 8.0;
    const centeringFactor = 0.0005;
    const avoidFactor = 0.01;
    const obstacleFactor = 0.003;
    const matchingFactor = 0.03;
    const maxSpeed = 1.0;
    const minSpeed = 0.5;
    const maxBias = 0.01;
    const biasIncrement = 0.00004;
    const biasVal = 0.001;
    const spawnRadius = worldBounds / 2;
    const numberOfBoids = 500;
    const numberAttractedToObstacles = 250;
    const numberOfObstacles = 15;

    const obstacleAttractionFactor = 0.001;
    const obstacleAttractionDistanceRatio = 0.3;

    function getRandomColor() {
        var letters = '0123456789ABCDEF';
        var color = '#';
        for (var i = 0; i < 6; i++) {
          color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    }

    function makeObstacleInstance(color, radius, x, z) {
        const material = new THREE.MeshToonMaterial({
            color
        });

        const obstacle = new THREE.Mesh(obstacleGeometry, material);
        obstacle.scale.multiplyScalar(radius);
        obstacle.userData.radius = radius;
        obstacle.userData.phase = Math.random() * Math.PI * 2;
        scene.add(obstacle);

        obstacle.position.set(x, Math.sin(obstacle.userData.phase) * worldBounds / 2, z);

        return obstacle;
    }

    function makeBoidInstance(color) {
        const material = new THREE.MeshToonMaterial({
            color
        });

        const boid = new THREE.Mesh(boidGeometry, material);

        boid.userData.velocity = new THREE.Vector3().randomDirection().multiplyScalar(Math.random() * (maxSpeed - minSpeed) + minSpeed);
        
        scene.add(boid);

        let spawnPoint = new THREE.Vector3().randomDirection();
        spawnPoint.normalize();
        spawnPoint.multiplyScalar(Math.random() * spawnRadius);
        
        boid.position.x = spawnPoint.x;
        boid.position.y = spawnPoint.y;
        boid.position.z = spawnPoint.z;

        return boid;
    }

    let boids = [];
    
    for(let i = 0; i < numberOfBoids; i++) {
        boids.push(makeBoidInstance(getRandomColor()));
    }

    let obstacles = [];

    for(let i = 0; i < numberOfObstacles; i++) {
        obstacles.push(makeObstacleInstance(getRandomColor(), Math.random() * 30 + 5, Math.random() * worldBounds - worldBounds / 2, Math.random() * worldBounds - worldBounds / 2));
    }

    function resizeRendererToDisplaySize(renderer) {
        const canvas = renderer.domElement;
        const pixelRatio = window.devicePixelRatio;
        const width = canvas.clientWidth * pixelRatio | 0;
        const height = canvas.clientHeight * pixelRatio | 0;
        const needResize = canvas.width !== width || canvas.height !== height;
        if (needResize) {
            renderer.setSize(width, height, false);
        }
        return needResize;
    }

    function render(time) {
        time *= 0.001;

        // required if controls.enableDamping or controls.autoRotate are set to true
	    controls.update();

        if (resizeRendererToDisplaySize(renderer)) {
            const canvas = renderer.domElement;
            camera.aspect = canvas.clientWidth / canvas.clientHeight;
            camera.updateProjectionMatrix();
        }

        obstacles.forEach((obstacle) => {
            obstacle.position.y = Math.sin(obstacle.userData.phase + time / (0.8 * obstacle.userData.radius)) * worldBounds / 2;
        });

        boids.forEach((boidA, ndxA) => {

            let obstacleVector = new THREE.Vector3();
            let obstacleAttractionVector = new THREE.Vector3();

            let closeVector = new THREE.Vector3();
            let avgVelocity = new THREE.Vector3();
            let avgPosition = new THREE.Vector3();
            let numNeighbors = 0;

            boids.forEach((boidB, ndxB) => {

                if(ndxA !== ndxB) {
                    // Check if within protected range
                    if (boidA.position.distanceTo(boidB.position) < protectedRange) {
                        // Seperation
                        closeVector.add(boidA.position).sub(boidB.position);

                        // Check if within visable range
                    } else if (boidA.position.distanceTo(boidB.position) < visualRange) {
                        numNeighbors += 1;

                        // Alignment
                        avgVelocity.add(boidB.userData.velocity);

                        // Cohesion
                        avgPosition.add(boidB.position);
                    }
                }
            });

            // Obstacles
            obstacles.forEach((obstacle, ndxB) => {
                // Check if within protected range
                if (boidA.position.distanceTo(obstacle.position) - obstacle.userData.radius < obstacleRange) {
                    // Seperation from obstacle
                    obstacleVector.add(boidA.position).sub(obstacle.position);
                } else

                // Check if boid is is attracted to obstacles
                if(ndxA < numberAttractedToObstacles) {
                    // Check if within attraction range
                    if (boidA.position.distanceTo(obstacle.position) - obstacle.userData.radius < obstacleRange + obstacleAttractionDistanceRatio * obstacle.userData.radius) {
                        // attraction from obstacle
                        obstacleAttractionVector.sub(boidA.position).add(obstacle.position);
                    }
                }
            });

            // Screen Edges

            if(boidA.position.x < -worldBounds / 2) {
                boidA.userData.velocity.x += turnfactor;
            }

            if(boidA.position.x > worldBounds / 2) {
                boidA.userData.velocity.x -= turnfactor;
            }

            if(boidA.position.y < -worldBounds / 2) {
                boidA.userData.velocity.y += turnfactor;
            }

            if(boidA.position.y > worldBounds / 2) {
                boidA.userData.velocity.y -= turnfactor;
            }

            if(boidA.position.z < -worldBounds / 2) {
                boidA.userData.velocity.z += turnfactor;
            }

            if(boidA.position.z > worldBounds / 2) {
                boidA.userData.velocity.z -= turnfactor;
            }

            // Bias
            // TODO

            // Update new Velocity
            boidA.userData.velocity.add(closeVector.multiplyScalar(avoidFactor));
            boidA.userData.velocity.add(obstacleVector.multiplyScalar(obstacleFactor));
            boidA.userData.velocity.add(obstacleAttractionVector.multiplyScalar(obstacleAttractionFactor));

            if (numNeighbors > 0) {
                avgVelocity.divideScalar(numNeighbors);
                avgPosition.divideScalar(numNeighbors);

                boidA.userData.velocity.add(avgVelocity.sub(boidA.userData.velocity).multiplyScalar(matchingFactor));
                boidA.userData.velocity.add(avgPosition.sub(boidA.position).multiplyScalar(centeringFactor));    
            }

            // Apply Speed Limits
            let speed = boidA.userData.velocity.length();

            if (speed < minSpeed) {
                boidA.userData.velocity.divideScalar(speed).multiplyScalar(minSpeed);
            }

            if (speed > maxSpeed) {
                boidA.userData.velocity.divideScalar(speed).multiplyScalar(maxSpeed);
            }

            // Update rotation based on velocity
            boidA.lookAt(new THREE.Vector3().addVectors(boidA.position, boidA.userData.velocity));

            // Update position
            boidA.position.x += boidA.userData.velocity.x;
            boidA.position.y += boidA.userData.velocity.y;
            boidA.position.z += boidA.userData.velocity.z;
        });

        renderer.render(scene, camera);

        requestAnimationFrame(render);
    }

    requestAnimationFrame(render);
}

main();