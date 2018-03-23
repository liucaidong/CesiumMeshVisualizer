
/// <reference path="../../../Source/ThirdParty/ammo.js-master/builds/ammo.js" />

/// <reference path="../common.js" />

//requirejs([
//       "../../../requirejs.config.js",
//       "../../../appconfig.js",
//       '../../../Source/Main',
//       '../common.js'
//], function (
//       config,
//       appconfig,
//       Cesium,
//       common
//       ) {
    MeshVisualizer = Cesium.MeshVisualizer;
    Mesh = Cesium.Mesh;
    MeshMaterial = Cesium.MeshMaterial;
    FramebufferTexture = Cesium.FramebufferTexture;
    GeometryUtils = Cesium.GeometryUtils;
    MeshPhongMaterial = Cesium.MeshPhongMaterial;
    BasicMeshMaterial = Cesium.BasicMeshMaterial;
    BasicGeometry = Cesium.BasicGeometry;

    LOD = Cesium.LOD;
    homePosition[2] = 50;
    init();

    var center = Cesium.Cartesian3.fromDegrees(homePosition[0], homePosition[1], 10);
    var modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(center);

    var meshVisualizer = new MeshVisualizer({
        modelMatrix: modelMatrix,
        up: { y: 1 },
        referenceAxisParameter: {
            length: 100,
            width: 0.05,
            headLength: 2,
            headWidth: 0.1
        }
    });
    viewer.scene.primitives.add(meshVisualizer);
    meshVisualizer.showReference = true;//显示坐标轴



    function createRandomColor() {
        return Cesium.Color.fromRandom({ alpha: 1 })//fromRgba(Math.floor(Math.random() * (1 << 24)));
    }
    function createMaterial() {
        return new MeshPhongMaterial({
            defaultColor: createRandomColor(),
            side: MeshMaterial.Sides.DOUBLE,
            translucent: false
        });
    }

    Cesium.Cartesian3.prototype.set = function (x, y, z) {
        this.x = x; this.y = y; this.z = z;
    }
    Cesium.Cartesian3.prototype.copy = function (src) {
        this.x = src.x; this.y = src.y; this.z = src.z;
    }

    Cesium.Cartesian2.prototype.set = function (x, y) {
        this.x = x; this.y = y;
    }
    Cesium.Cartesian2.prototype.copy = function (src) {
        this.x = src.x; this.y = src.y;
    }
    Cesium.Quaternion.prototype.set = function (x, y, z, w) {
        this.x = x; this.y = y; this.z = z; this.w = w;
    }
    Cesium.Quaternion.prototype.copy = function (src) {
        this.x = src.x; this.y = src.y; this.z = src.z; this.w = src.w;
    }

    Ammo().then(function () {
        // - Global variables -

        // - Global variables -


        // Physics variables
        var gravityConstant = -9.8;
        var collisionConfiguration;
        var dispatcher;
        var broadphase;
        var solver;
        var physicsWorld;
        var rigidBodies = [];
        var margin = 0.05;
        var hinge;
        var rope;
        var transformAux1 = new Ammo.btTransform();

        var time = 0;
        var armMovement = 0;

        function initPhysics() {

            // Physics configuration

            collisionConfiguration = new Ammo.btSoftBodyRigidBodyCollisionConfiguration();
            dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration);
            broadphase = new Ammo.btDbvtBroadphase();
            solver = new Ammo.btSequentialImpulseConstraintSolver();
            softBodySolver = new Ammo.btDefaultSoftBodySolver();
            physicsWorld = new Ammo.btSoftRigidDynamicsWorld(dispatcher, broadphase, solver, collisionConfiguration, softBodySolver);
            physicsWorld.setGravity(new Ammo.btVector3(0, gravityConstant, 0));
            physicsWorld.getWorldInfo().set_m_gravity(new Ammo.btVector3(0, gravityConstant, 0));

        }

        function createObjects() {

            var pos = new Cesium.Cartesian3();
            var quat = new Cesium.Quaternion();

            // Ground
            pos.set(0, -0.5, 0);
            quat.set(0, 0, 0, 1);
            var ground = createParalellepiped(40, 1, 40, 0, pos, quat, new MeshPhongMaterial({
                defaultColor: Cesium.Color.fromRgba(0xFFFFFF).withAlpha(1),//"rgb(200,200,200)",
                side: MeshMaterial.Sides.DOUBLE,
                translucent: false
            }));
            ground.quaternion = null;
            // Ball
            var ballMass = 1.2;
            var ballRadius = 0.6;

            var ball = new Mesh(new Cesium.SphereGeometry({
                radius: ballRadius,
                stackPartitions: 20,
                slicePartitions: 20
            }), new MeshPhongMaterial({
                defaultColor: Cesium.Color.fromRgba(0x000000).withAlpha(1),
                side: MeshMaterial.Sides.DOUBLE,
                translucent: false
            }));

            var ballShape = new Ammo.btSphereShape(ballRadius);
            ballShape.setMargin(margin);
            pos.set(-3, 2, 0);
            quat.set(0, 0, 0, 1);
            createRigidBody(ball, ballShape, ballMass, pos, quat);
            ball.physicsBody.setFriction(0.5);

            // Wall
            var brickMass = 0.5;
            var brickLength = 1.2;
            var brickDepth = 0.6;
            var brickHeight = brickLength * 0.5;
            var numBricksLength = 6;
            var numBricksHeight = 8;
            var z0 = -numBricksLength * brickLength * 0.5;
            pos.set(0, brickHeight * 0.5, z0);
            quat.set(0, 0, 0, 1);
            for (var j = 0; j < numBricksHeight; j++) {

                var oddRow = (j % 2) == 1;

                pos.z = z0;

                if (oddRow) {
                    pos.z -= 0.25 * brickLength;
                }

                var nRow = oddRow ? numBricksLength + 1 : numBricksLength;
                for (var i = 0; i < nRow; i++) {

                    var brickLengthCurrent = brickLength;
                    var brickMassCurrent = brickMass;
                    if (oddRow && (i == 0 || i == nRow - 1)) {
                        brickLengthCurrent *= 0.5;
                        brickMassCurrent *= 0.5;
                    }

                    var brick = createParalellepiped(brickDepth, brickHeight, brickLengthCurrent, brickMassCurrent, pos, quat, createMaterial());


                    if (oddRow && (i == 0 || i == nRow - 2)) {
                        pos.z += 0.75 * brickLength;
                    }
                    else {
                        pos.z += brickLength;
                    }

                }
                pos.y += brickHeight;
            }

            // The rope
            // Rope graphic object
            var ropeNumSegments = 10;
            var ropeLength = 4;
            var ropeMass = 3;
            var ropePos = ball.position.clone();
            ropePos.y += ballRadius;

            var segmentLength = ropeLength / ropeNumSegments; 
            var ropeMaterial = new MeshMaterial({
                defaultColor: Cesium.Color.fromRgba(0x000000).withAlpha(1),
                side: MeshMaterial.Sides.DOUBLE,
                translucent: false, wireframe: true
            });
            var ropePositions = [];
            var ropeIndices = [];

            for (var i = 0; i < ropeNumSegments + 1; i++) {
                ropePositions.push(ropePos.x, ropePos.y + i * segmentLength, ropePos.z);
            }

            for (var i = 0; i < ropeNumSegments; i++) {
                ropeIndices.push(i, i + 1);
            }

            var ropeGeometry = new Cesium.Geometry({
                attributes: {
                    position: new Cesium.GeometryAttribute({
                        componentDatatype: Cesium.ComponentDatatype.DOUBLE,
                        componentsPerAttribute: 3,
                        values: new Float32Array(ropePositions)
                    })
                },
                indices: new Uint16Array(ropeIndices),
                primitiveType: Cesium.PrimitiveType.LINES,
                boundingSphere: Cesium.BoundingSphere.fromVertices(ropePositions)
            });
             
            rope = new Mesh(ropeGeometry, ropeMaterial); 
            meshVisualizer.add(rope);

            // Rope physic object
            var softBodyHelpers = new Ammo.btSoftBodyHelpers();
            var ropeStart = new Ammo.btVector3(ropePos.x, ropePos.y, ropePos.z);
            var ropeEnd = new Ammo.btVector3(ropePos.x, ropePos.y + ropeLength, ropePos.z);
            var ropeSoftBody = softBodyHelpers.CreateRope(physicsWorld.getWorldInfo(), ropeStart, ropeEnd, ropeNumSegments - 1, 0);
            var sbConfig = ropeSoftBody.get_m_cfg();
            sbConfig.set_viterations(10);
            sbConfig.set_piterations(10);
            ropeSoftBody.setTotalMass(ropeMass, false)
            Ammo.castObject(ropeSoftBody, Ammo.btCollisionObject).getCollisionShape().setMargin(margin * 3);
            physicsWorld.addSoftBody(ropeSoftBody, 1, -1);
            rope.physicsBody = ropeSoftBody;
            // Disable deactivation
            ropeSoftBody.setActivationState(4);

            // The base
            var armMass = 2;
            var armLength = 3;
            var pylonHeight = ropePos.y + ropeLength;
            var baseMaterial = createMaterial(); 
            pos.set(ropePos.x, 0.1, ropePos.z - armLength);
            quat.set(0, 0, 0, 1);
            var base = createParalellepiped(1, 0.2, 1, 0, pos, quat, baseMaterial);
            base.quaternion = null;
            pos.set(ropePos.x, 0.5 * pylonHeight, ropePos.z - armLength);
            var pylon = createParalellepiped(0.4, pylonHeight, 0.4, 0, pos, quat, baseMaterial);
            pylon.quaternion = null;

            pos.set(ropePos.x, pylonHeight + 0.2, ropePos.z - 0.5 * armLength);
            var arm = createParalellepiped(0.4, 0.4, armLength + 0.4, armMass, pos, quat, baseMaterial);


            // Glue the rope extremes to the ball and the arm
            var influence = 1;
            ropeSoftBody.appendAnchor(0, ball.physicsBody, true, influence);
            ropeSoftBody.appendAnchor(ropeNumSegments, arm.physicsBody, true, influence);

            // Hinge constraint to move the arm
            var pivotA = new Ammo.btVector3(0, pylonHeight * 0.5, 0);
            var pivotB = new Ammo.btVector3(0, -0.2, -armLength * 0.5);
            var axis = new Ammo.btVector3(0, 1, 0);
            hinge = new Ammo.btHingeConstraint(pylon.physicsBody, arm.physicsBody, pivotA, pivotB, axis, axis, true);
            physicsWorld.addConstraint(hinge, true);


        }

        function createParalellepiped(sx, sy, sz, mass, pos, quat, material) {
            var box = Cesium.BoxGeometry.fromDimensions({
                dimensions: new Cesium.Cartesian3(sx, sy, sz),
                vertexFormat: new Cesium.VertexFormat({
                    position: true,
                    normal: true
                })
            });
            var threeObject = new Mesh(box, material);
            var shape = new Ammo.btBoxShape(new Ammo.btVector3(sx * 0.5, sy * 0.5, sz * 0.5));
            shape.setMargin(margin);

            createRigidBody(threeObject, shape, mass, pos, quat);

            return threeObject;

        }

        function createRigidBody(threeObject, physicsShape, mass, pos, quat) {

            threeObject.position.copy(pos);
            threeObject.quaternion = new Cesium.Quaternion(quat);

            var transform = new Ammo.btTransform();
            transform.setIdentity();
            transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
            transform.setRotation(new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w));
            var motionState = new Ammo.btDefaultMotionState(transform);

            var localInertia = new Ammo.btVector3(0, 0, 0);
            physicsShape.calculateLocalInertia(mass, localInertia);

            var rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, physicsShape, localInertia);
            var body = new Ammo.btRigidBody(rbInfo);

            threeObject.physicsBody = body;

            meshVisualizer.add(threeObject);

            if (mass > 0) {
                rigidBodies.push(threeObject);

                // Disable deactivation
                body.setActivationState(4);
            }

            physicsWorld.addRigidBody(body);

        }

        function initInput() {

            window.addEventListener('keydown', function (event) {

                switch (event.keyCode) {
                    // Q
                    case 81:
                        armMovement = 1;
                        break;

                        // A
                    case 65:
                        armMovement = -1;
                        break;
                }

            }, false);

            window.addEventListener('keyup', function (event) {

                armMovement = 0;

            }, false);

        }

        function updatePhysics(deltaTime) {

            // Hinge control
            hinge.enableAngularMotor(true, 1.5 * armMovement, 50);

            // Step world
            physicsWorld.stepSimulation(deltaTime, 10);

            // Update rope
            var softBody = rope.physicsBody;
            var ropePositions = rope.geometry.attributes.position.values;
            var numVerts = ropePositions.length / 3;
            var nodes = softBody.get_m_nodes();
            var indexFloat = 0;
            for (var i = 0; i < numVerts; i++) {

                var node = nodes.at(i);
                var nodePos = node.get_m_x();
                ropePositions[indexFloat++] = nodePos.x();
                ropePositions[indexFloat++] = nodePos.y();
                ropePositions[indexFloat++] = nodePos.z();

            }
            rope.geometry.attributes.position.needsUpdate = true;

            // Update rigid bodies
            for (var i = 0, il = rigidBodies.length; i < il; i++) {
                var objThree = rigidBodies[i];
                var objPhys = objThree.physicsBody;
                var ms = objPhys.getMotionState();
                if (ms) {

                    ms.getWorldTransform(transformAux1);
                    var p = transformAux1.getOrigin();
                    var q = transformAux1.getRotation();
                    objThree.position.set(p.x(), p.y(), p.z());
                    if (objThree.quaternion) {
                        objThree.quaternion.set(q.x(), q.y(), q.z(), q.w());
                    }
                    objThree.modelMatrixNeedsUpdate = true;
                }
            }

        }

        var init = false;
        var start = false;
        var startTime = new Date();
        function update(frameState) {
            var deltaTime = (new Date() - startTime) / 1000.0;
            updatePhysics(deltaTime);

            startTime = new Date();
        }
        setTimeout(function () {
            if (!init) {
                // - Init - 

                initPhysics();

                createObjects();

                initInput();

                init = true;
            }
            if (!start) {
                startTime = new Date();
                meshVisualizer.beforeUpdate.addEventListener(update);
                start = true;
            } else {
                meshVisualizer.beforeUpdate.removeEventListener(update);
                start = false;

            }
        }, 1000 * 3);
    });

//});
